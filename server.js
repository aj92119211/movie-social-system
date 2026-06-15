const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const XLSX = require("xlsx");
const OpenAI = require("openai");
const { analyzePost, runMovieEditorApi } = require("./server/routes/ai");
const { MOVIE_EDITOR_SYSTEM_PROMPT } = require("./server/ai/movieEditorPrompt");

const rootDir = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";
const authSessions = new Set();

loadEnvFile(path.join(rootDir, ".env.local"));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendBuffer(response, statusCode, buffer, headers = {}) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(buffer);
}

function envValue(key) {
  return String(process.env[key] || "").trim();
}

function previewSecret(value) {
  if (!value) {
    return "";
  }
  const cleanValue = String(value).trim();
  const tail = cleanValue.slice(-4);
  return `${cleanValue.slice(0, 3)}...${tail}`;
}

function authConfig() {
  return {
    username: envValue("APP_AUTH_USERNAME"),
    password: envValue("APP_AUTH_PASSWORD"),
  };
}

function isAuthEnabled() {
  const config = authConfig();
  return Boolean(config.username && config.password);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf("=");
        return separatorIndex === -1 ? [item, ""] : [item.slice(0, separatorIndex), decodeURIComponent(item.slice(separatorIndex + 1))];
      })
  );
}

function isAuthenticated(request) {
  if (!isAuthEnabled()) return true;
  const token = parseCookies(request).wve_session;
  return Boolean(token && authSessions.has(token));
}

function sendUnauthorized(response) {
  sendJson(response, 401, { error: "請先登入後再使用系統。" });
}

async function handleAuthLogin(request, response) {
  if (!isAuthEnabled()) {
    sendJson(response, 200, { ok: true, enabled: false });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const config = authConfig();
  if (String(body.username || "").trim() !== config.username || String(body.password || "") !== config.password) {
    sendJson(response, 401, { error: "帳號或密碼錯誤。" });
    return;
  }

  const token = crypto.randomUUID();
  authSessions.add(token);
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Set-Cookie": `wve_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  });
  response.end(JSON.stringify({ ok: true, enabled: true }));
}

function handleAuthLogout(request, response) {
  const token = parseCookies(request).wve_session;
  if (token) authSessions.delete(token);
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Set-Cookie": "wve_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  });
  response.end(JSON.stringify({ ok: true }));
}

function handleAuthStatus(request, response) {
  sendJson(response, 200, {
    enabled: isAuthEnabled(),
    authenticated: isAuthenticated(request),
  });
}

async function syncStatus(request, response) {
  try {
    const movies = await supabaseRequest("/movies?select=id&limit=1000");
    const moviesWithCover = await supabaseRequest("/movies?select=id&cover_url=neq.&limit=1000");
    const collections = await supabaseRequest("/workflow_collections?select=kind,data");
    const styleExamples = await supabaseRequest("/ai_style_examples?select=id&limit=1000").catch(() => []);
    const counts = Object.fromEntries((collections || []).map((row) => [row.kind, Array.isArray(row.data) ? row.data.length : 0]));
    sendJson(response, 200, {
      movies: Array.isArray(movies) ? movies.length : 0,
      movieCovers: Array.isArray(moviesWithCover) ? moviesWithCover.length : 0,
      styleExamples: Array.isArray(styleExamples) ? styleExamples.length : 0,
      assets: counts.assets || 0,
      schedules: counts.schedules || 0,
      questions: counts.questions || 0,
      activities: counts.activities || 0,
      postAnalyses: counts.postAnalyses || 0,
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "同步狀態讀取失敗。" });
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml; charset=utf-8",
  };

  return types[extension] || "application/octet-stream";
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(rootDir, pathname));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

function requireSupabaseConfig() {
  const url = envValue("SUPABASE_URL").replace(/\/$/, "");
  const key = envValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    const error = new Error("缺少 Supabase 設定，請在 .env.local 設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY。");
    error.statusCode = 500;
    throw error;
  }

  return { url, key };
}

function mapMovieFromDb(row) {
  const title = row.title || row.name || row.movie_title || row.movieTitle || "";
  return {
    id: row.id,
    title: String(title).trim() || "未命名電影",
    genre: row.genre,
    releaseDate: row.release_date?.replaceAll("-", "/") || "",
    releaseStatus: row.release_status || "未上映",
    socialTone: row.social_tone || "",
    coreSellingPoints: Array.isArray(row.core_selling_points) ? row.core_selling_points : [],
    phase: row.phase || "策略規劃",
    owner: row.owner || "未指派",
    progress: row.progress ?? 10,
    color: row.color || "#234a8f",
    coverUrl: row.cover_url || "",
  };
}

function mapMovieToDb(movie) {
  return {
    title: movie.title,
    genre: movie.genre,
    release_date: normalizeReleaseDateForDb(movieReleaseDateInput(movie)),
    release_status: movie.releaseStatus || "未上映",
    social_tone: movie.socialTone,
    core_selling_points: Array.isArray(movie.coreSellingPoints) ? movie.coreSellingPoints : [],
    phase: movie.phase || "策略規劃",
    owner: movie.owner || "未指派",
    progress: movie.progress ?? 10,
    color: movie.color || "#234a8f",
    cover_url: movie.coverUrl || "",
  };
}

function normalizeReleaseDateForDb(value) {
  const releaseDate = String(value ?? "").trim();
  return releaseDate ? releaseDate.replaceAll("/", "-") : null;
}

function movieReleaseDateInput(movie) {
  if (Object.prototype.hasOwnProperty.call(movie, "releaseDate")) return movie.releaseDate;
  if (Object.prototype.hasOwnProperty.call(movie, "release_date")) return movie.release_date;
  return null;
}

function shouldClearReleaseDate(movie) {
  return (
    (Object.prototype.hasOwnProperty.call(movie, "releaseDate") || Object.prototype.hasOwnProperty.call(movie, "release_date")) &&
    normalizeReleaseDateForDb(movieReleaseDateInput(movie)) === null
  );
}

function mapStyleExampleFromDb(row) {
  const score = Math.min(5, Math.max(1, Math.round(Number(row.score || 3))));
  return {
    id: row.id,
    type: row.type || "",
    platform: row.platform || "",
    movieGenre: row.movie_genre || "",
    campaignStage: row.campaign_stage || "",
    tone: row.tone || "",
    exampleContent: row.example_content || "",
    whyItWorks: row.why_it_works || "",
    usageNote: row.usage_note || "",
    qualityTags: Array.isArray(row.quality_tags) ? row.quality_tags : [],
    useCase: row.use_case || "",
    isActive: row.is_active !== false,
    score,
    aiInstruction: row.ai_instruction || "",
  };
}

function mapStyleExampleToDb(example, includeAdvancedFields = true) {
  const payload = {
    type: String(example.type || "").trim(),
    platform: String(example.platform || "").trim(),
    movie_genre: String(example.movieGenre || "").trim(),
    campaign_stage: String(example.campaignStage || "").trim(),
    tone: String(example.tone || "").trim(),
    example_content: String(example.exampleContent || "").trim(),
    why_it_works: String(example.whyItWorks || "").trim(),
    usage_note: String(example.usageNote || "").trim(),
  };
  if (includeAdvancedFields) {
    payload.quality_tags = Array.isArray(example.qualityTags) ? example.qualityTags : [];
    payload.use_case = String(example.useCase || "").trim();
    payload.is_active = example.isActive !== false;
    payload.score = Math.min(5, Math.max(1, Math.round(Number(example.score || 3))));
    payload.ai_instruction = String(example.aiInstruction || "").trim();
  }
  return payload;
}

function mapProjectBoardFromDb(row) {
  const movie = row.movies || row.movie || {};
  const movieName = movie.title || movie.name || movie.movie_title || row.project_name || "";
  return {
    id: row.id,
    movieId: row.movie_id || "",
    movieName,
    projectName: movieName,
    owner: row.owner || "",
    currentPhase: row.current_phase || "",
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    status: row.status || "",
    projectUrl: row.project_url || "",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function mapProjectBoardToDb(board) {
  return {
    movie_id: String(board.movieId || "").trim() || null,
    project_name: String(board.projectName || "").trim(),
    owner: String(board.owner || "").trim(),
    current_phase: String(board.currentPhase || "").trim(),
    start_date: String(board.startDate || "").trim() || null,
    due_date: String(board.dueDate || "").trim() || null,
    status: String(board.status || "未開始").trim(),
    project_url: String(board.projectUrl || "").trim(),
    notes: String(board.notes || "").trim(),
  };
}

function validateProjectBoardPayload(board) {
  if (!String(board.movieId || "").trim()) {
    return "請先選擇電影作為專案名稱。";
  }
  return "";
}

async function ensureProjectBoardMovieName(board) {
  if (String(board.projectName || "").trim()) {
    return board;
  }
  const movieId = String(board.movieId || "").trim();
  if (!movieId) {
    return board;
  }
  const rows = await supabaseRequest(`/movies?id=eq.${encodeURIComponent(movieId)}&select=id,title&limit=1`);
  const movie = rows?.[0] || {};
  return {
    ...board,
    projectName: movie.title || movie.name || movie.movie_title || "未命名電影",
  };
}

async function saveMovieToSupabase(pathname, method, movie) {
  const payload = mapMovieToDb(movie);
  try {
    return await supabaseRequest(pathname, {
      method,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!String(error.message || "").includes("release_status")) throw error;
    delete payload.release_status;
    const rows = await supabaseRequest(pathname, {
      method,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    return rows.map((row) => ({ ...row, release_status: movie.releaseStatus || "未上映" }));
  }
}

async function ensureMovieReleaseDateCleared(pathname, rows, shouldClear) {
  if (!shouldClear || rows?.[0]?.release_date == null) return rows;
  const clearedRows = await supabaseRequest(pathname, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ release_date: null }),
  });
  if (clearedRows?.[0]?.release_date != null) {
    const error = new Error("上映日期清空失敗，Supabase 仍回傳舊日期。");
    error.statusCode = 500;
    throw error;
  }
  return clearedRows;
}

function validateStyleExamplePayload(example) {
  const requiredFields = ["type", "platform", "movieGenre", "campaignStage", "tone", "exampleContent"];
  for (const field of requiredFields) {
    if (!String(example[field] || "").trim()) {
      return `${field} is required`;
    }
  }

  return "";
}

function validateMoviePayload(movie) {
  const requiredFields = ["title", "genre", "socialTone"];
  for (const field of requiredFields) {
    if (!String(movie[field] || "").trim()) {
      return `${field} is required`;
    }
  }

  return "";
}

async function saveStyleExampleToSupabase(pathname, method, example) {
  try {
    return await supabaseRequest(pathname, {
      method,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(mapStyleExampleToDb(example)),
    });
  } catch (error) {
    const message = String(error?.message || "");
    const missingColumn = ["quality_tags", "use_case", "is_active", "score", "ai_instruction"].find((column) => message.includes(column));
    if (missingColumn) {
      const setupError = new Error(`Supabase 缺少欄位 ${missingColumn}，請先在 SQL Editor 執行 supabase/ai_style_examples_update.sql。`);
      setupError.statusCode = 500;
      throw setupError;
    }
    throw error;
  }
}

function createExternalServiceError(error, serviceName) {
  const causeDetails = [
    error?.cause?.code,
    error?.cause?.hostname,
    error?.cause?.message,
  ].filter(Boolean);
  const detailText = causeDetails.length ? ` (${causeDetails.join(" / ")})` : "";
  const wrappedError = new Error(
    `${serviceName} 連線失敗，請檢查環境變數、網路、防火牆、Proxy 或 DNS 設定。${detailText}`
  );
  wrappedError.statusCode = 502;
  return wrappedError;
}

async function supabaseRequest(pathname, options = {}) {
  const config = requireSupabaseConfig();
  let response;

  try {
    response = await fetch(`${config.url}/rest/v1${pathname}`, {
      ...options,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw createExternalServiceError(error, "Supabase");
  }

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || "Supabase request failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function handleMoviesApi(request, response, movieId) {
  try {
    if (request.method === "GET" && !movieId) {
      const rows = await supabaseRequest("/movies?select=*&order=created_at.desc");
      sendJson(response, 200, { movies: rows.map(mapMovieFromDb) });
      return;
    }

    if (request.method === "POST" && !movieId) {
      const body = await readJsonBody(request);
      const validationError = validateMoviePayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const rows = await saveMovieToSupabase("/movies?select=*", "POST", body);
      sendJson(response, 201, { movie: mapMovieFromDb(rows[0]) });
      return;
    }

    if (request.method === "PATCH" && movieId) {
      const body = await readJsonBody(request);
      const validationError = validateMoviePayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      let rows = await saveMovieToSupabase(`/movies?id=eq.${encodeURIComponent(movieId)}&select=*`, "PATCH", body);
      rows = await ensureMovieReleaseDateCleared(`/movies?id=eq.${encodeURIComponent(movieId)}&select=*`, rows, shouldClearReleaseDate(body));

      if (!rows[0]) {
        sendJson(response, 404, { error: "找不到電影資料。" });
        return;
      }

      sendJson(response, 200, { movie: mapMovieFromDb(rows[0]) });
      return;
    }

    if (request.method === "DELETE" && movieId) {
      await supabaseRequest(`/movies?id=eq.${encodeURIComponent(movieId)}`, {
        method: "DELETE",
      });
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Movies API failed" });
  }
}

async function handleProjectBoardsApi(request, response, boardId) {
  try {
    if (request.method === "GET" && !boardId) {
      const rows = await supabaseRequest("/project_boards?select=*,movies(id,title)&order=updated_at.desc");
      sendJson(response, 200, { projectBoards: (rows || []).map(mapProjectBoardFromDb) });
      return;
    }

    if (request.method === "POST" && !boardId) {
      let body = await readJsonBody(request);
      const validationError = validateProjectBoardPayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      body = await ensureProjectBoardMovieName(body);
      const rows = await supabaseRequest("/project_boards?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapProjectBoardToDb(body)),
      });
      sendJson(response, 201, { projectBoard: mapProjectBoardFromDb(rows[0]) });
      return;
    }

    if (request.method === "PUT" && boardId) {
      let body = await readJsonBody(request);
      const validationError = validateProjectBoardPayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      body = await ensureProjectBoardMovieName(body);
      const rows = await supabaseRequest(`/project_boards?id=eq.${encodeURIComponent(boardId)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapProjectBoardToDb(body)),
      });
      if (!rows?.[0]) {
        sendJson(response, 404, { error: "找不到專案大表。" });
        return;
      }
      sendJson(response, 200, { projectBoard: mapProjectBoardFromDb(rows[0]) });
      return;
    }

    if (request.method === "DELETE" && boardId) {
      await supabaseRequest(`/project_boards?id=eq.${encodeURIComponent(boardId)}`, { method: "DELETE" });
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Project boards API failed" });
  }
}

async function loadRelevantStyleExamples(filters = {}) {
  try {
    const rows = await supabaseRequest("/ai_style_examples?select=*&limit=1000");
    const examples = (rows || []).map(mapStyleExampleFromDb).filter((example) => example.isActive !== false);
    const normalize = (value) => {
      const text = String(value || "").trim();
      const aliases = {
        Instagram: "IG",
        Facebook: "FB",
        "IG 限動": "IG",
        Reels: "IG",
        "Instagram Reels": "IG",
        驚悚: "恐怖",
        前導期: "上映前",
        預告上線: "上映前",
        倒數貼文: "上映前",
        上映倒數: "上映前",
        上映提醒: "上映中",
        場次有限: "上映中",
        口碑擴散: "口碑期",
        口碑推廣: "口碑期",
        媒體好評: "口碑期",
      };
      return (aliases[text] || text).toLowerCase();
    };
    const normalized = {
      type: normalize(filters.type),
      platform: normalize(filters.platform),
      movieGenre: normalize(filters.movieGenre || filters.genre),
      campaignStage: normalize(filters.campaignStage || filters.stage),
      tone: normalize(filters.tone),
    };
    const isGeneric = (value) => normalize(value) === "通用";
    const matchesExactOrGeneric = (fieldValue, filterValue) => !filterValue || normalize(fieldValue) === filterValue || isGeneric(fieldValue);

    return examples
      .filter((example) => {
        if (normalized.type && normalize(example.type) !== normalized.type) return false;
        if (!matchesExactOrGeneric(example.platform, normalized.platform)) return false;
        if (!matchesExactOrGeneric(example.movieGenre, normalized.movieGenre)) return false;
        if (!matchesExactOrGeneric(example.campaignStage, normalized.campaignStage)) return false;
        return true;
      })
      .map((example) => {
        const fields = {
          platform: normalize(example.platform),
          movieGenre: normalize(example.movieGenre),
          campaignStage: normalize(example.campaignStage),
          tone: normalize(example.tone),
        };
        const matchScore = [
          normalized.platform && fields.platform === normalized.platform ? 1 : 0,
          normalized.movieGenre && fields.movieGenre === normalized.movieGenre ? 1 : 0,
          normalized.campaignStage && fields.campaignStage === normalized.campaignStage ? 1 : 0,
          normalized.tone && fields.tone && (fields.tone.includes(normalized.tone) || normalized.tone.includes(fields.tone)) ? 0.5 : 0,
        ].reduce((total, value) => total + value, 0);
        const genericPenalty = [example.platform, example.movieGenre, example.campaignStage].filter(isGeneric).length * 0.25;
        const qualityScore = Number(example.score || 3) / 5;
        return { example, score: matchScore * 10 + qualityScore - genericPenalty };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.example);
  } catch {
    return [];
  }
}

function styleExamplesPromptBlock(examples) {
  if (!Array.isArray(examples) || !examples.length) return "";
  return [
    "可參考的 AI 風格範例：",
    ...examples.map((example, index) => [
      `範例 ${index + 1}`,
      `類型：${example.type || "未提供"}`,
      `平台：${example.platform || "未提供"}`,
      `電影類型：${example.movieGenre || "未提供"}`,
      `宣傳情境：${example.campaignStage || "未提供"}`,
      `語氣：${example.tone || "未提供"}`,
      `範例內容：${example.exampleContent || "未提供"}`,
      `好在哪裡：${example.whyItWorks || "未提供"}`,
      `使用建議：${example.usageNote || "未提供"}`,
      `品質標籤：${Array.isArray(example.qualityTags) && example.qualityTags.length ? example.qualityTags.join("、") : "未提供"}`,
      `適用任務：${example.useCase || "未提供"}`,
      `推薦分數：${example.score || 3}/5`,
      `AI 使用提示：${example.aiInstruction || "未提供"}`,
    ].join("\n")),
    "請參考以上範例的語氣、節奏與操作邏輯，但不要逐字照抄。",
  ].join("\n\n");
}

async function handleStyleExamplesApi(request, response, exampleId) {
  try {
    if (request.method === "GET" && exampleId === "__schema") {
      const rows = await supabaseRequest("/ai_style_examples?select=quality_tags,use_case,is_active,score,ai_instruction&limit=1");
      sendJson(response, 200, { ok: true, checked: true, rows: Array.isArray(rows) ? rows.length : 0 });
      return;
    }

    if (request.method === "GET" && !exampleId) {
      const rows = await supabaseRequest("/ai_style_examples?select=*&limit=1000");
      sendJson(response, 200, { examples: (rows || []).map(mapStyleExampleFromDb) });
      return;
    }

    if (request.method === "POST" && !exampleId) {
      const body = await readJsonBody(request);
      const validationError = validateStyleExamplePayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const rows = await saveStyleExampleToSupabase("/ai_style_examples?select=*", "POST", body);
      sendJson(response, 201, { example: mapStyleExampleFromDb(rows[0]) });
      return;
    }

    if (request.method === "PATCH" && exampleId) {
      const body = await readJsonBody(request);
      const validationError = validateStyleExamplePayload(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const rows = await saveStyleExampleToSupabase(`/ai_style_examples?id=eq.${encodeURIComponent(exampleId)}&select=*`, "PATCH", body);
      if (!rows[0]) {
        sendJson(response, 404, { error: "找不到 AI 風格範例。" });
        return;
      }
      sendJson(response, 200, { example: mapStyleExampleFromDb(rows[0]) });
      return;
    }

    if (request.method === "DELETE" && exampleId) {
      await supabaseRequest(`/ai_style_examples?id=eq.${encodeURIComponent(exampleId)}`, {
        method: "DELETE",
      });
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "AI style examples API failed" });
  }
}

function percentRate(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  return bottom ? Number(((top / bottom) * 100).toFixed(2)) : 0;
}

function mapAnalyticsPeriodFromDb(row) {
  return {
    id: row.id,
    movieId: row.movie_id || "",
    weekLabel: row.week_label || "",
    dateRange: row.date_range || "",
    platform: row.platform || "",
    phase: row.phase || "",
    totalReach: Number(row.total_reach || 0),
    totalViews: Number(row.total_views || 0),
    totalEngagement: Number(row.total_engagement || 0),
    newFollowers: Number(row.new_followers || 0),
    nonFollowerRate: Number(row.non_follower_rate || 0),
    engagementRate: Number(row.engagement_rate || 0),
    bestPost: row.best_post || "",
    worstPost: row.worst_post || "",
    weeklyConclusion: row.weekly_conclusion || "",
    nextWeekSuggestion: row.next_week_suggestion || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function mapAnalyticsPeriodToDb(item) {
  const totalReach = Number(item.totalReach || 0);
  const totalEngagement = Number(item.totalEngagement || 0);
  return {
    movie_id: String(item.movieId || "").trim(),
    week_label: String(item.weekLabel || "").trim(),
    date_range: String(item.dateRange || "").trim(),
    platform: String(item.platform || "").trim(),
    phase: String(item.phase || "").trim(),
    total_reach: totalReach,
    total_views: Number(item.totalViews || 0),
    total_engagement: totalEngagement,
    new_followers: Number(item.newFollowers || 0),
    non_follower_rate: Number(item.nonFollowerRate || 0),
    engagement_rate: percentRate(totalEngagement, totalReach),
    best_post: String(item.bestPost || "").trim(),
    worst_post: String(item.worstPost || "").trim(),
    weekly_conclusion: String(item.weeklyConclusion || "").trim(),
    next_week_suggestion: String(item.nextWeekSuggestion || "").trim(),
  };
}

function mapSocialPostMetricFromDb(row) {
  return {
    id: row.id,
    movieId: row.movie_id || "",
    platform: row.platform || "",
    phase: row.phase || "",
    postDate: row.post_date || "",
    recordedDate: row.recorded_date || "",
    observationPeriod: row.observation_period || "",
    postTitle: row.post_title || "",
    contentType: row.content_type || "",
    postUrl: row.post_url || "",
    reach: Number(row.reach || 0),
    views: Number(row.views || 0),
    engagement: Number(row.engagement || 0),
    shares: Number(row.shares || 0),
    saves: Number(row.saves || 0),
    comments: Number(row.comments || 0),
    newFollowers: Number(row.new_followers || 0),
    nonFollowerRate: Number(row.non_follower_rate || 0),
    engagementRate: Number(row.engagement_rate || 0),
    cta: row.cta || "",
    conclusion: row.conclusion || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function mapSocialPostMetricToDb(item) {
  const reach = Number(item.reach || 0);
  const engagement = Number(item.engagement || 0);
  return {
    movie_id: String(item.movieId || "").trim(),
    platform: String(item.platform || "").trim(),
    phase: String(item.phase || "").trim(),
    post_date: item.postDate || null,
    recorded_date: item.recordedDate || null,
    observation_period: String(item.observationPeriod || "發文後 7 天").trim(),
    post_title: String(item.postTitle || "").trim(),
    content_type: String(item.contentType || "").trim(),
    post_url: String(item.postUrl || "").trim(),
    reach,
    views: Number(item.views || 0),
    engagement,
    shares: Number(item.shares || 0),
    saves: Number(item.saves || 0),
    comments: Number(item.comments || 0),
    new_followers: Number(item.newFollowers || 0),
    non_follower_rate: Number(item.nonFollowerRate || 0),
    engagement_rate: percentRate(engagement, reach),
    cta: String(item.cta || "").trim(),
    conclusion: String(item.conclusion || "").trim(),
  };
}

async function handleSocialAnalyticsApi(request, response, url) {
  try {
    if (request.method === "POST" && url.pathname === "/api/social-analytics/export") {
      const body = await readJsonBody(request);
      const workbook = XLSX.utils.book_new();
      const periodRows = Array.isArray(body.periodRows) && body.periodRows.length ? body.periodRows : [{ 提示: "目前沒有資料" }];
      const postRows = Array.isArray(body.postRows) && body.postRows.length ? body.postRows : [{ 提示: "目前沒有資料" }];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(periodRows), "區間統計");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(postRows), "貼文成效");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const safeFileName = String(body.fileName || `社群數據分析_${new Date().toISOString().slice(0, 10)}.xlsx`)
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/[\r\n]/g, "");
      sendBuffer(response, 200, buffer, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/social-analytics") {
      const movieId = String(url.searchParams.get("movieId") || "").trim();
      if (!movieId) {
        sendJson(response, 400, { error: "請先選擇電影專案。" });
        return;
      }
      const queryMovieId = encodeURIComponent(movieId);
      const [periods, posts] = await Promise.all([
        supabaseRequest(`/social_analytics_periods?movie_id=eq.${queryMovieId}&select=*&order=created_at.desc`),
        supabaseRequest(`/social_post_metrics?movie_id=eq.${queryMovieId}&select=*&order=post_date.desc`),
      ]);
      sendJson(response, 200, {
        periods: (periods || []).map(mapAnalyticsPeriodFromDb),
        posts: (posts || []).map(mapSocialPostMetricFromDb),
      });
      return;
    }

    const periodId = url.pathname.startsWith("/api/social-analytics/periods/")
      ? decodeURIComponent(url.pathname.replace("/api/social-analytics/periods/", ""))
      : "";
    const postId = url.pathname.startsWith("/api/social-analytics/posts/")
      ? decodeURIComponent(url.pathname.replace("/api/social-analytics/posts/", ""))
      : "";

    if (url.pathname === "/api/social-analytics/periods" && request.method === "POST") {
      const body = await readJsonBody(request);
      const rows = await supabaseRequest("/social_analytics_periods?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapAnalyticsPeriodToDb(body)),
      });
      sendJson(response, 201, { period: mapAnalyticsPeriodFromDb(rows[0]) });
      return;
    }

    if (periodId && request.method === "PATCH") {
      const body = await readJsonBody(request);
      const rows = await supabaseRequest(`/social_analytics_periods?id=eq.${encodeURIComponent(periodId)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapAnalyticsPeriodToDb(body)),
      });
      sendJson(response, 200, { period: mapAnalyticsPeriodFromDb(rows[0]) });
      return;
    }

    if (periodId && request.method === "DELETE") {
      await supabaseRequest(`/social_analytics_periods?id=eq.${encodeURIComponent(periodId)}`, { method: "DELETE" });
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/social-analytics/posts" && request.method === "POST") {
      const body = await readJsonBody(request);
      const rows = await supabaseRequest("/social_post_metrics?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapSocialPostMetricToDb(body)),
      });
      sendJson(response, 201, { post: mapSocialPostMetricFromDb(rows[0]) });
      return;
    }

    if (postId && request.method === "PATCH") {
      const body = await readJsonBody(request);
      const rows = await supabaseRequest(`/social_post_metrics?id=eq.${encodeURIComponent(postId)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(mapSocialPostMetricToDb(body)),
      });
      sendJson(response, 200, { post: mapSocialPostMetricFromDb(rows[0]) });
      return;
    }

    if (postId && request.method === "DELETE") {
      await supabaseRequest(`/social_post_metrics?id=eq.${encodeURIComponent(postId)}`, { method: "DELETE" });
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    const message = String(error.message || "");
    const setupHint = message.includes("social_analytics_periods") || message.includes("social_post_metrics")
      ? "請先在 Supabase SQL Editor 執行 supabase/social_analytics_tables.sql。"
      : "";
    sendJson(response, error.statusCode || 500, { error: `${message || "數據分析 API 失敗。"}${setupHint ? ` ${setupHint}` : ""}` });
  }
}

const workflowCollectionKinds = new Set(["assets", "schedules", "activities", "questions", "socialMetrics", "postAnalyses"]);

async function handleWorkflowDataApi(request, response, kind) {
  try {
    if (request.method === "GET" && !kind) {
      const rows = await supabaseRequest("/workflow_collections?select=kind,data");
      const collections = Object.fromEntries(workflowCollectionKinds.keys().map((item) => [item, []]));
      for (const row of rows || []) {
        if (workflowCollectionKinds.has(row.kind)) collections[row.kind] = Array.isArray(row.data) ? row.data : [];
      }
      sendJson(response, 200, { collections });
      return;
    }

    if (request.method === "PUT" && kind && workflowCollectionKinds.has(kind)) {
      const body = await readJsonBody(request);
      const data = Array.isArray(body.data) ? body.data : [];
      await supabaseRequest("/workflow_collections?on_conflict=kind", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ kind, data }),
      });
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Workflow data API failed" });
  }
}

function normalizeCopyPayload(value) {
  const cleanCopyList = (items) => Array.isArray(items)
    ? items
        .map((item) => String(item || "")
          .replace(/"\],\s*"(igPosts|threadsPosts|storyQuestions|replySuggestions|copies)"[\s\S]*$/u, "")
          .replace(/\}\s*Reviewing the content:[\s\S]*$/u, "")
          .replace(/\s*# Done\.[\s\S]*$/u, "")
          .replace(/\s*\(END\)[\s\S]*$/u, "")
          .trim())
        .filter((item) => item && !/^(Reviewing the content|Final answer|No extra text|JSON only)/i.test(item))
        .slice(0, 10)
    : [];
  const copies = cleanCopyList(value?.copies);
  const legacyCopies = [
    ...cleanCopyList(value?.facebookPosts),
    ...cleanCopyList(value?.igPosts),
    ...cleanCopyList(value?.threadsPosts),
  ].slice(0, 10);
  return {
    copies: copies.length ? copies : legacyCopies,
  };
}

function parseOpenAiJsonText(outputText) {
  const text = String(outputText || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("OpenAI 回傳格式無法解析，請重新生成一次。");
  }
}

function normalizeQuestionToolPayload(value) {
  return {
    items: Array.isArray(value?.items)
      ? value.items.map((item, index) => ({
          title: String(item?.title || `結果 ${index + 1}`),
          text: String(item?.text || ""),
        })).filter((item) => item.text)
      : [],
  };
}

function normalizeQuestionBatchPayload(value) {
  return {
    questions: Array.isArray(value?.questions)
      ? value.questions.map((item) => ({
          content: String(item?.content || "").trim(),
          movieGenre: String(item?.movieGenre || item?.movie_genre || ""),
          type: String(item?.type || "開放問答"),
          platform: String(item?.platform || "IG 限動"),
          tone: String(item?.tone || "親切"),
          phase: String(item?.phase || "預告上線"),
          cta: String(item?.cta || "回覆或留言告訴我們"),
          asset: String(item?.asset || "主視覺海報"),
          note: String(item?.note || ""),
        })).filter((item) => item.content)
      : [],
  };
}

function normalizeGeneratedConclusion(text) {
  return String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/^結論[:：]\s*/u, "")
    .trim();
}

function fallbackPeriodConclusion(data) {
  const reach = Number(data.totalReach || 0);
  const views = Number(data.totalViews || 0);
  const engagement = Number(data.totalEngagement || 0);
  const followers = Number(data.newFollowers || 0);
  const engagementRate = reach ? ((engagement / reach) * 100) : 0;
  const reachText = reach >= 10000 ? "觸及具備一定規模" : reach > 0 ? "觸及仍在累積" : "目前觸及資料不足";
  const interactionText = engagementRate >= 6 ? "互動率表現不錯" : engagementRate >= 3 ? "互動率屬於可觀察水準" : "互動表現仍偏保守";
  const followerText = followers > 0 ? "仍需觀察互動是否能穩定轉為追蹤" : "新增追蹤有限，轉粉誘因仍可加強";
  const nextStep = data.nextWeekSuggestion || "加強 CTA、素材鉤子與高互動題材延伸";
  return `${data.weekLabel || "本區間"}在${data.platform || "社群平台"}的${reachText}，總瀏覽 ${views}、總互動 ${engagement}，${interactionText}。${followerText}。後續建議以${nextStep}為主，並持續比較最佳與最弱貼文的內容差異。`;
}

function openAiErrorMessage(statusCode, data) {
  if (statusCode === 401) {
    const code = data?.error?.code || data?.error?.type || "unauthorized";
    return `OpenAI 拒絕這把 API Key（${code}）。請重新產生一把新的 OpenAI API key，填到 Render 的 OPENAI_API_KEY 後重新部署。`;
  }
  if (statusCode === 429) {
    return "OpenAI API 額度不足或付款方案尚未啟用，請到 OpenAI 後台檢查用量與 Billing。";
  }
  return data?.error?.message || "OpenAI API 請求失敗。";
}

async function testOpenAI(response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  const model = "gpt-4o-mini";

  if (!openaiApiKey) {
    sendJson(response, 503, {
      ok: false,
      stage: "env",
      error: "OPENAI_API_KEY is missing",
    });
    return;
  }

  const keyPreview = previewSecret(openaiApiKey);
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "你是一位測試助手，請使用繁體中文。" },
        { role: "user", content: "請只回覆：OpenAI 測試成功" },
      ],
      temperature: 0,
    });
    const result = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("[TEST_OPENAI_SUCCESS] OpenAI test route succeeded");
    sendJson(response, 200, {
      ok: true,
      stage: "openai",
      hasOpenAIKey: true,
      keyPreview,
      model,
      result,
    });
  } catch (error) {
    console.error("[TEST_OPENAI_ERROR]", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      name: error?.name,
    });
    sendJson(response, 500, {
      ok: false,
      stage: "openai",
      hasOpenAIKey: true,
      keyPreview,
      model,
      error: error?.message || "OpenAI test failed",
      status: error?.status || null,
      code: error?.code || null,
    });
  }
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function analyticsConclusionPrompt(type, data) {
  if (type === "period") {
    return [
      "你是一位資深影視社群數據分析師，請根據以下「區間社群統計資料」產出一段適合放進週報的繁體中文分析結論。",
      "",
      "請遵守：",
      "- 使用繁體中文",
      "- 80 到 120 字",
      "- 語氣專業但自然",
      "- 不要條列",
      "- 不要加標題",
      "- 不要誇大數據",
      "- 如果數據不足，請保守分析",
      "- 需要包含：本期整體表現、可能原因、下週優化方向",
      "",
      "資料如下：",
      `電影名稱：${data.movieName || "未提供"}`,
      `週次：${data.weekLabel || "未提供"}`,
      `日期區間：${data.dateRange || "未提供"}`,
      `平台：${data.platform || "未提供"}`,
      `宣傳階段：${data.phase || "未提供"}`,
      `總觸及：${data.totalReach}`,
      `總瀏覽：${data.totalViews}`,
      `總互動：${data.totalEngagement}`,
      `新增追蹤：${data.newFollowers}`,
      `非粉絲比例：${data.nonFollowerRate}`,
      `互動率：${data.engagementRate}`,
      `最佳貼文：${data.bestPost || "未提供"}`,
      `最差貼文：${data.worstPost || "未提供"}`,
      "",
      "請只回傳結論文字。",
    ].join("\n");
  }

  return [
    "你是一位資深影視社群數據分析師，請根據以下「單篇貼文成效資料」產出一段適合放進週報的繁體中文分析結論。",
    "",
    "請遵守：",
    "- 使用繁體中文",
    "- 80 到 120 字",
    "- 語氣專業但自然",
    "- 不要條列",
    "- 不要加標題",
    "- 不要誇大數據",
    "- 如果數據不足，請保守分析",
    "- 需要包含：主要表現、可能原因、下一步建議",
    "",
    "資料如下：",
    `電影名稱：${data.movieName || "未提供"}`,
    `平台：${data.platform || "未提供"}`,
    `宣傳階段：${data.phase || "未提供"}`,
    `貼文主題：${data.postTitle || "未提供"}`,
    `內容類型：${data.contentType || "未提供"}`,
    `觀察週期：${data.observationPeriod || "未提供"}`,
    `觸及：${data.reach}`,
    `瀏覽：${data.views}`,
    `互動：${data.engagement}`,
    `分享：${data.shares}`,
    `收藏：${data.saves}`,
    `留言：${data.comments}`,
    `新增追蹤：${data.newFollowers}`,
    `非粉絲比例：${data.nonFollowerRate}`,
    `互動率：${data.engagementRate}`,
    `CTA：${data.cta || "未提供"}`,
    "",
    "請只回傳結論文字。",
  ].join("\n");
}

function normalizeAnalyticsConclusionData(type, rawData = {}) {
  if (type === "period") {
    const totalReach = safeNumber(rawData.totalReach);
    const totalEngagement = safeNumber(rawData.totalEngagement);
    return {
      movieName: String(rawData.movieName || "").trim(),
      weekLabel: String(rawData.weekLabel || "").trim(),
      dateRange: String(rawData.dateRange || "").trim(),
      platform: String(rawData.platform || "").trim(),
      phase: String(rawData.phase || "").trim(),
      totalReach,
      totalViews: safeNumber(rawData.totalViews),
      totalEngagement,
      newFollowers: safeNumber(rawData.newFollowers),
      nonFollowerRate: safeNumber(rawData.nonFollowerRate),
      engagementRate: totalReach > 0 ? Number((totalEngagement / totalReach).toFixed(4)) : 0,
      bestPost: String(rawData.bestPost || "").trim(),
      worstPost: String(rawData.worstPost || "").trim(),
    };
  }

  const reach = safeNumber(rawData.reach);
  const engagement = safeNumber(rawData.engagement);
  return {
    movieName: String(rawData.movieName || "").trim(),
    platform: String(rawData.platform || "").trim(),
    phase: String(rawData.phase || "").trim(),
    postDate: String(rawData.postDate || "").trim(),
    recordedDate: String(rawData.recordedDate || "").trim(),
    observationPeriod: String(rawData.observationPeriod || "").trim(),
    postTitle: String(rawData.postTitle || "").trim(),
    contentType: String(rawData.contentType || "").trim(),
    reach,
    views: safeNumber(rawData.views),
    engagement,
    shares: safeNumber(rawData.shares),
    saves: safeNumber(rawData.saves),
    comments: safeNumber(rawData.comments),
    newFollowers: safeNumber(rawData.newFollowers),
    nonFollowerRate: safeNumber(rawData.nonFollowerRate),
    engagementRate: reach > 0 ? Number((engagement / reach).toFixed(4)) : 0,
    cta: String(rawData.cta || "").trim(),
  };
}

async function generateAnalyticsConclusion(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const type = body?.type === "period" ? "period" : body?.type === "post" ? "post" : "";
  const data = type ? normalizeAnalyticsConclusionData(type, body?.data || {}) : null;
  console.log("[AI_CONCLUSION_REQUEST]", {
    type,
    hasData: Boolean(data),
    keys: data ? Object.keys(data) : [],
  });

  if (!type || !data) {
    sendJson(response, 400, { error: "Invalid analytics conclusion type." });
    return;
  }
  if (!data.movieName || !data.platform) {
    sendJson(response, 400, { error: "請先填寫電影名稱與平台，再生成結論。" });
    return;
  }

  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 503, { error: "OPENAI_API_KEY is missing" });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "你是一位資深影視社群數據分析師，請使用繁體中文，回覆要專業但自然。" },
        { role: "user", content: analyticsConclusionPrompt(type, data) },
      ],
      temperature: 0.4,
    });
    const conclusion = normalizeGeneratedConclusion(completion.choices?.[0]?.message?.content || "");
    if (!conclusion) {
      sendJson(response, 502, { error: "OpenAI 回傳空白內容，請稍後再試。" });
      return;
    }
    sendJson(response, 200, { conclusion });
  } catch (error) {
    console.error("[AI_CONCLUSION_ERROR]", {
      type,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      name: error?.name,
    });
    sendJson(response, 500, { error: error?.message || "AI 結論生成失敗，請稍後再試。" });
  }
}

async function generatePostInsight(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "尚未設定 OpenAI API Key，請到 Render Environment Variables 設定 OPENAI_API_KEY。" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const hasBasicData = body?.movieName && body?.platform && body?.postTitle && (
    Number(body.reach || 0) || Number(body.views || 0) || Number(body.engagement || 0)
  );
  if (!hasBasicData) {
    sendJson(response, 400, { error: "請先填寫基本貼文數據，再生成結論。" });
    return;
  }

  const prompt = `
你是一位資深影視社群數據分析師，請根據以下貼文成效資料，產出一段適合放進週報的繁體中文分析結論。

請遵守：
- 使用繁體中文
- 80 到 120 字
- 語氣專業但自然
- 不要條列
- 不要誇大數據
- 如果數據不足，請保守分析
- 需要包含：主要表現、可能原因、下一步建議

貼文資料：
電影名稱：${body.movieName || "未提供"}
平台：${body.platform || "未提供"}
宣傳階段：${body.phase || "未提供"}
發文日期：${body.postDate || "未提供"}
數據記錄日：${body.recordedDate || "未提供"}
貼文主題：${body.postTitle || "未提供"}
內容類型：${body.contentType || "未提供"}
觀察週期：${body.observationPeriod || "未提供"}
觸及：${body.reach ?? 0}
瀏覽：${body.views ?? 0}
互動：${body.engagement ?? 0}
分享：${body.shares ?? 0}
收藏：${body.saves ?? 0}
留言：${body.comments ?? 0}
新增追蹤：${body.newFollowers ?? 0}
非粉絲比例：${body.nonFollowerRate ?? 0}
互動率：${body.engagementRate ?? 0}
CTA：${body.cta || "未提供"}

請只回傳結論文字，不要加標題。
`.trim();

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions: "你是影視社群數據分析師。請只輸出一段繁體中文週報結論，不要條列、不要加標題。",
        input: prompt,
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      if (openaiResponse.status !== 401) {
        sendJson(response, 200, { conclusion: fallbackPeriodConclusion(body), fallback: true });
        return;
      }
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    sendJson(response, 200, { conclusion: normalizeGeneratedConclusion(outputText) || fallbackPeriodConclusion(body) });
  } catch (error) {
    sendJson(response, 200, { conclusion: fallbackPeriodConclusion(body), fallback: true });
  }
}

async function generatePeriodInsight(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "尚未設定 OpenAI API Key，請到 Render Environment Variables 設定 OPENAI_API_KEY。" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const hasBasicData = body?.movieName && body?.platform && (body?.weekLabel || body?.dateRange) && (
    Number(body.totalReach || 0) || Number(body.totalViews || 0) || Number(body.totalEngagement || 0)
  );
  if (!hasBasicData) {
    sendJson(response, 400, { error: "請先填寫基本區間數據，再生成結論。" });
    return;
  }

  const prompt = `
你是一位資深影視社群數據分析師，請根據以下電影社群區間統計資料，產出一段適合放進週報的繁體中文本週結論。

請遵守：
- 使用繁體中文
- 80 到 120 字
- 語氣專業但自然
- 不要條列
- 不要誇大數據
- 如果數據不足，請保守分析
- 需要包含：本區間主要表現、可能原因、下週優化方向

區間資料：
電影名稱：${body.movieName || "未提供"}
週次：${body.weekLabel || "未提供"}
日期區間：${body.dateRange || "未提供"}
平台：${body.platform || "未提供"}
宣傳階段：${body.phase || "未提供"}
總觸及：${body.totalReach ?? 0}
總瀏覽：${body.totalViews ?? 0}
總互動：${body.totalEngagement ?? 0}
新增追蹤：${body.newFollowers ?? 0}
非粉絲比例：${body.nonFollowerRate ?? 0}
互動率：${body.engagementRate ?? 0}
最佳貼文：${body.bestPost || "未提供"}
最差貼文：${body.worstPost || "未提供"}
下週調整建議：${body.nextWeekSuggestion || "未提供"}

請只回傳結論文字，不要加標題。
`.trim();

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions: "你是影視社群數據分析師。請只輸出一段繁體中文週報結論，不要條列、不要加標題。",
        input: prompt,
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    sendJson(response, 200, { conclusion: normalizeGeneratedConclusion(outputText) });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: "AI 結論生成失敗，請稍後再試。" });
  }
}

async function generatePostInsightStrict(request, response) {
  return generatePostInsight(request, response);
}

async function generatePeriodInsightSafe(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const numberValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const totalReach = numberValue(body.totalReach);
  const totalEngagement = numberValue(body.totalEngagement);
  const payload = {
    movieName: String(body.movieName || "").trim(),
    weekLabel: String(body.weekLabel || "").trim(),
    dateRange: String(body.dateRange || "").trim(),
    platform: String(body.platform || "").trim(),
    phase: String(body.phase || "").trim(),
    totalReach,
    totalViews: numberValue(body.totalViews),
    totalEngagement,
    newFollowers: numberValue(body.newFollowers),
    nonFollowerRate: numberValue(body.nonFollowerRate),
    engagementRate: totalReach > 0 ? Number((totalEngagement / totalReach).toFixed(4)) : 0,
    bestPost: String(body.bestPost || "").trim(),
    worstPost: String(body.worstPost || "").trim(),
  };

  const hasBasicData = payload.movieName && payload.platform;
  if (!hasBasicData) {
    sendJson(response, 400, { error: "請先填寫基本區間數據，再生成結論。" });
    return;
  }

  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const prompt = [
    "你是一位資深影視社群數據分析師，請根據以下「區間社群統計資料」產出一段適合放進週報的繁體中文分析結論。",
    "請遵守：使用繁體中文，80 到 120 字，語氣專業但自然，不要條列，不要加標題，不要誇大數據。",
    "如果數據不足，請保守分析；內容需要包含本期整體表現、可能原因、下週優化方向。",
    "資料如下：",
    `電影名稱：${payload.movieName || "未提供"}`,
    `週次：${payload.weekLabel || "未提供"}`,
    `日期區間：${payload.dateRange || "未提供"}`,
    `平台：${payload.platform || "未提供"}`,
    `宣傳階段：${payload.phase || "未提供"}`,
    `總觸及：${payload.totalReach}`,
    `總瀏覽：${payload.totalViews}`,
    `總互動：${payload.totalEngagement}`,
    `新增追蹤：${payload.newFollowers}`,
    `非粉絲比例：${payload.nonFollowerRate}`,
    `互動率：${payload.engagementRate}`,
    `最佳貼文：${payload.bestPost || "未提供"}`,
    `最差貼文：${payload.worstPost || "未提供"}`,
    "請只回傳結論文字，不要加標題。",
  ].join("\n");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions: "你是影視社群數據分析師。請只輸出一段繁體中文週報結論，不要條列、不要加標題。",
        input: prompt,
      }),
    });
    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }
    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    const conclusion = normalizeGeneratedConclusion(outputText);
    if (!conclusion) {
      sendJson(response, 502, { error: "OpenAI 回傳空白內容，請稍後再試。" });
      return;
    }
    sendJson(response, 200, { conclusion });
  } catch (error) {
    console.error("Period insight OpenAI error:", error);
    sendJson(response, 500, { error: "AI 結論生成失敗，請稍後再試。" });
  }
}

async function generateCopy(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "尚未設定 OpenAI API Key" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const movie = body.movie || {};
  const sellingPoints = Array.isArray(movie.coreSellingPoints) ? movie.coreSellingPoints.join("、") : "";
  const scenario = String(body.scenario || body.focus || "通用").trim();
  const releaseDate = String(movie.releaseDate || movie.release_date || "").trim();
  const spoilerRules = String(movie.spoilerRules || movie.spoiler_rules || movie.noSpoiler || "").trim();
  const styleExamples = await loadRelevantStyleExamples({
    type: "貼文",
    platform: "通用",
    movieGenre: movie.genre,
    campaignStage: scenario,
    tone: movie.socialTone,
  });
  const prompt = [
    `電影：${movie.title || "未命名電影"}`,
    `類型：${movie.genre || "未提供"}`,
    `上映日期：${releaseDate || "未提供"}`,
    `目前上映狀態：${movie.releaseStatus || "未提供"}`,
    `社群語氣：${movie.socialTone || "未提供"}`,
    `核心賣點：${sellingPoints || "未提供"}`,
    `禁止爆雷內容：${spoilerRules || "未提供"}`,
    `文案用途：通用社群文案，適合 FB、IG、Threads 使用`,
    `宣傳情境：${scenario || "通用"}`,
    `補充重點：${body.focus || "請依電影資料產生社群宣傳文案"}`,
    styleExamplesPromptBlock(styleExamples),
  ].join("\n");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions: [
          MOVIE_EDITOR_SYSTEM_PROMPT,
          "這次任務是產生電影社群貼文。請根據電影資料、溝通重點與風格範例，產生 10 則通用社群文案，適合用於 FB、IG、Threads。每則文案需有不同角度，不要重複。",
          "可以使用使用者提供的上映日期、宣傳情境與核心賣點；不要自行捏造未提供的日期、劇情、場次或票房資訊。社群語氣只代表文字風格，不代表日期資訊。",
          "AI 風格範例只能參考語氣、節奏與策略，不可直接複製範例原文。",
          "文案請使用繁體中文、自然、有小編感，不要太像新聞稿，文字不要太長。每一則只放可直接發布或可直接使用的內容，不要放 JSON key、格式符號、分析說明、Reviewing、Final answer、END 或任何系統文字。",
          "只回傳符合 schema 的 JSON。",
        ].join("\n\n"),
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "movie_social_copy",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                copies: {
                  type: "array",
                  minItems: 10,
                  maxItems: 10,
                  items: { type: "string" },
                },
              },
              required: ["copies"],
            },
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    const parsed = parseOpenAiJsonText(outputText);
    sendJson(response, 200, normalizeCopyPayload(parsed));
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "文案生成失敗，請稍後再試。",
    });
  }
}

async function generateQuestionTool(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "尚未設定 OpenAI API Key" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const mode = body.mode === "similar" ? "similar" : "rewrite";
  const question = body.question || {};
  const styleExamples = await loadRelevantStyleExamples({
    type: mode === "rewrite" ? "互動題改寫" : "互動題",
    platform: question.platform,
    movieGenre: question.movieGenre || question.genre,
    campaignStage: question.phase,
    tone: question.tone,
  });
  const prompt = [
    `任務：${mode === "rewrite" ? "將互動題改寫成不同平台版本" : "根據原題產生 5 題相似互動題"}`,
    `原題：${question.content || "未提供"}`,
    `電影專案：${question.movieTitle || question.movieName || "未指定"}`,
    `題型：${question.type || "未提供"}`,
    `平台：${question.platform || "未提供"}`,
    `語氣：${question.tone || "未提供"}`,
    `宣傳階段：${question.phase || "未提供"}`,
    `建議 CTA：${question.cta || "未提供"}`,
    `備註：${question.note || "無"}`,
    styleExamplesPromptBlock(styleExamples),
  ].join("\n");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions:
          mode === "rewrite"
            ? "你是影視社群互動題企劃。請用繁體中文，把原互動題改寫成 IG 限動版、Threads 版、Facebook 版、Reels 字卡版。保持不劇透、自然、適合小編直接使用。只回傳符合 schema 的 JSON。"
            : "你是影視社群互動題企劃。請用繁體中文，根據原互動題產生 5 題相似題。每題角度要不同、適合社群互動、不劇透。只回傳符合 schema 的 JSON。",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "movie_question_tool",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                items: {
                  type: "array",
                  minItems: mode === "rewrite" ? 4 : 5,
                  maxItems: mode === "rewrite" ? 4 : 5,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["title", "text"],
                  },
                },
              },
              required: ["items"],
            },
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    const parsed = parseOpenAiJsonText(outputText);
    sendJson(response, 200, normalizeQuestionToolPayload(parsed));
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "互動題 AI 產生失敗，請稍後再試。",
    });
  }
}

async function generateQuestionBatch(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 500, { error: "尚未設定 OpenAI API Key" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const movie = body.movie || {};
  const sellingPoints = Array.isArray(movie.coreSellingPoints) ? movie.coreSellingPoints.join("、") : "";
  const styleExamples = await loadRelevantStyleExamples({
    type: "互動題",
    platform: "IG 限動",
    movieGenre: movie.genre,
    campaignStage: "互動題",
    tone: movie.socialTone,
  });
  const prompt = [
    "任務：產生 10 題新的社群互動問答題，請避免和既有題庫太相似。",
    `電影：${movie.title || "未命名電影"}`,
    `類型：${movie.genre || "未提供"}`,
    `上映日期：${movie.releaseDate || "未提供"}`,
    `社群語氣：${movie.socialTone || "未提供"}`,
    `核心賣點：${sellingPoints || "未提供"}`,
    `目前題庫數量：${body.existingCount || 0}`,
    `產生批次代號：${body.batchSeed || Date.now()}`,
    "請混合 IG 限動、Threads、Facebook、Reels，可包含投票、二選一、開放問答、留言引導、測驗等題型。",
    styleExamplesPromptBlock(styleExamples),
  ].join("\n");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions:
          "你是影視社群互動題企劃。請使用繁體中文，根據電影資料產生 10 題新的互動問答題。題目要適合小編直接使用、不劇透、角度多元，並提供電影類型、題型、平台、語氣、宣傳階段、CTA、建議素材與備註。只回傳符合 schema 的 JSON。",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "movie_question_batch",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                questions: {
                  type: "array",
                  minItems: 10,
                  maxItems: 10,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      content: { type: "string" },
                      movieGenre: { type: "string" },
                      type: { type: "string" },
                      platform: { type: "string" },
                      tone: { type: "string" },
                      phase: { type: "string" },
                      cta: { type: "string" },
                      asset: { type: "string" },
                      note: { type: "string" },
                    },
                    required: ["content", "movieGenre", "type", "platform", "tone", "phase", "cta", "asset", "note"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, { error: openAiErrorMessage(openaiResponse.status, data) });
      return;
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    const parsed = parseOpenAiJsonText(outputText);
    sendJson(response, 200, normalizeQuestionBatchPayload(parsed));
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "AI 題目生成失敗，請稍後再試。",
    });
  }
}

function configStatus(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  const supabaseUrl = envValue("SUPABASE_URL");
  const supabaseKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
  sendJson(response, 200, {
    supabaseUrlSet: Boolean(supabaseUrl),
    supabaseKeySet: Boolean(supabaseKey),
    openaiKeySet: Boolean(openaiApiKey),
    openaiModel: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
  });
}

async function openaiStatus(request, response) {
  const openaiApiKey = envValue("OPENAI_API_KEY");
  if (!openaiApiKey) {
    sendJson(response, 200, {
      openaiKeySet: false,
      ok: false,
      status: 0,
      message: "Render 沒有讀到 OPENAI_API_KEY。",
    });
    return;
  }

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${openaiApiKey}` },
    });
    const data = await openaiResponse.json().catch(() => ({}));
    sendJson(response, 200, {
      openaiKeySet: true,
      ok: openaiResponse.ok,
      status: openaiResponse.status,
      errorCode: data?.error?.code || "",
      errorType: data?.error?.type || "",
      errorMessage: data?.error?.message || "",
      openaiModel: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
    });
  } catch (error) {
    sendJson(response, 500, {
      openaiKeySet: true,
      ok: false,
      status: 0,
      message: error.message || "無法連線到 OpenAI。",
    });
  }
}

function detectSocialPlatform(linkUrl) {
  const hostname = new URL(linkUrl).hostname.replace(/^www\./, "");
  if (hostname.includes("instagram.com")) return linkUrl.includes("/reel/") ? "Instagram Reels" : "Instagram";
  if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) return "Facebook";
  if (hostname.includes("threads.net")) return "Threads";
  if (hostname.includes("tiktok.com")) return "TikTok";
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YouTube Shorts";
  return "未知平台";
}

function normalizeSocialMetric(value, fallbackPlatform) {
  return {
    platform: value?.platform || fallbackPlatform,
    reach: Number(value?.reach || value?.views || value?.impressions || 0),
    likes: Number(value?.likes || 0),
    comments: Number(value?.comments || 0),
    shares: Number(value?.shares || value?.reposts || 0),
    saves: Number(value?.saves || value?.bookmarks || 0),
    newFollowers: Number(value?.newFollowers || value?.followers || 0),
  };
}

function buildSocialReport(linkUrl, metric, providerName) {
  const interactions = metric.likes + metric.comments + metric.shares + metric.saves;
  const engagement = metric.reach ? ((interactions / metric.reach) * 100).toFixed(2) : "0.00";
  return {
    source: `來源連結：${linkUrl}｜資料來源：${providerName}`,
    highlights: [
      { title: "平台", text: metric.platform },
      { title: "觸及", text: String(metric.reach) },
      { title: "互動率", text: `${engagement}%` },
    ],
    insights: [
      `${metric.platform} 目前互動率為 ${engagement}%，可用來評估本篇內容是否適合追加投放。`,
      `本篇總互動為 ${interactions}，其中收藏 ${metric.saves}、分享 ${metric.shares}，可觀察素材是否具備二次擴散價值。`,
      `新增追蹤 ${metric.newFollowers}，可對照文案 CTA 與發布時間，判斷是否帶來轉粉。`,
    ],
    actions: [
      "若收藏高於分享，建議改成懶人包或限動重發。",
      "若留言高，建議同步建立互動問答題延續討論。",
      "若觸及高但互動低，建議重寫開頭三秒鉤子與 CTA。",
    ],
  };
}

async function fetchSocialMetricFromProvider(linkUrl, platform) {
  const providerUrl = process.env.SOCIAL_ANALYTICS_API_URL;
  const providerKey = process.env.SOCIAL_ANALYTICS_API_KEY;

  if (!providerUrl || !providerKey) {
    return null;
  }

  let providerResponse;
  try {
    providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: linkUrl, platform }),
    });
  } catch (error) {
    throw createExternalServiceError(error, "社群數據 API");
  }

  const text = await providerResponse.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!providerResponse.ok) {
    const error = new Error(payload?.message || payload?.error || "社群數據 API 請求失敗。");
    error.statusCode = providerResponse.status;
    throw error;
  }

  return normalizeSocialMetric(payload?.metric || payload, platform);
}

async function analyzeSocialLink(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  let linkUrl;
  try {
    linkUrl = new URL(body.url).toString();
  } catch {
    sendJson(response, 400, { error: "請貼上有效的社群貼文連結。" });
    return;
  }

  try {
    const platform = detectSocialPlatform(linkUrl);
    const metric = await fetchSocialMetricFromProvider(linkUrl, platform);
    if (!metric) {
      sendJson(response, 200, {
        mode: "manual",
        platform,
        message: "目前使用手動數據分析模式，未串接外部社群數據服務。",
      });
      return;
    }
    sendJson(response, 200, {
      mode: "external",
      metric,
      report: buildSocialReport(linkUrl, metric, process.env.SOCIAL_ANALYTICS_PROVIDER || "Social Analytics API"),
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "社群連結分析失敗。" });
  }
}

const twEntertainmentNewsSources = [
  { name: "鏡報娛樂", domain: "mirrormedia.mg" },
  { name: "ETtoday 星光雲", domain: "star.ettoday.net" },
  { name: "Yahoo 娛樂", domain: "tw.news.yahoo.com" },
  { name: "聯合報噓！星聞", domain: "stars.udn.com" },
  { name: "聯合新聞網", domain: "udn.com" },
  { name: "中央社訊息平台", domain: "cna.com.tw" },
  { name: "鏡報娛樂", domain: "mirrordaily.news" },
  { name: "蕃新聞", domain: "n.yam.com" },
  { name: "三立新聞網娛樂", domain: "setn.com" },
  { name: "自由娛樂", domain: "ent.ltn.com.tw" },
  { name: "TVBS 娛樂", domain: "news.tvbs.com.tw" },
  { name: "中時新聞網娛樂", domain: "chinatimes.com" },
  { name: "NOWnews 娛樂", domain: "nownews.com" },
  { name: "台視新聞", domain: "news.ttv.com.tw" },
  { name: "電影神搜", domain: "news.agentm.tw" },
  { name: "DramaQueen 電視迷", domain: "dramaqueen.com.tw" },
  { name: "台灣電影網", domain: "taiwancinema.bamid.gov.tw" },
  { name: "TAVIS", domain: "tavis.tw" },
  { name: "文策院", domain: "taicca.tw" },
  { name: "文化部影視及流行音樂產業局", domain: "bamid.gov.tw" },
  { name: "開眼電影網", domain: "atmovies.com.tw" },
  { name: "全國電影票房統計資訊", domain: "boxofficetw.tfai.org.tw" },
];

const twEntertainmentSocialSources = [
  { platform: "Dcard", domain: "dcard.tw/f/movie", accountName: "Dcard 電影版", searchUrl: "https://www.dcard.tw/f/movie" },
  { platform: "Threads", domain: "threads.net", accountName: "Threads 搜尋入口", searchOnly: true },
  { platform: "Facebook", domain: "facebook.com", accountName: "Facebook 搜尋入口", searchOnly: true },
  { platform: "Instagram", domain: "instagram.com", accountName: "Instagram 搜尋入口", searchOnly: true },
];

const twEntertainmentExcludedKeywords = [
  "影評", "心得", "推薦", "懶人包", "片單", "劇透", "雷文", "八卦", "私生活", "星座", "炎上", "穿搭", "感情", "緋聞", "戀情", "結婚", "離婚", "不倫", "家暴", "吵架", "粉絲", "網友反應", "網友熱議", "18禁", "成人", "情色", "情趣", "情趣用品", "西斯", "性事", "約炮", "麥當勞", "厚鬆餅", "台股", "外資", "IC設計", "記憶體", "大立光", "國巨", "金像電", "SpaceX", "馬斯克", "AI算力", "軌道", "股票", "投顧", "電子股", "化工", "美伊", "道奇", "Glasnow", "畢業生", "國小", "社區警衛", "掛屍", "夜市", "雨彈", "淹水", "國民黨", "民進黨", "鄭麗文", "毒駕", "撞死", "張善政", "世足", "世界盃", "紅牌", "墨西哥", "南非",
];

const twEntertainmentUnsafeSocialUrlPatterns = [
  /\/topics\/%E6%83%85%E8%B6%A3%E7%94%A8%E5%93%81/i,
  /\/topics\/情趣用品/i,
  /\/f\/sex/i,
  /\/f\/adult/i,
];

const twEntertainmentOfficialDomains = [
  "taiwancinema.bamid.gov.tw",
  "tavis.tw",
  "taicca.tw",
  "bamid.gov.tw",
  "boxofficetw.tfai.org.tw",
];

const twEntertainmentTrustedTaiwanMediaDomains = [
  "mirrormedia.mg",
  "star.ettoday.net",
  "tw.news.yahoo.com",
  "stars.udn.com",
  "udn.com",
  "cna.com.tw",
  "mirrordaily.news",
  "n.yam.com",
  "setn.com",
  "ent.ltn.com.tw",
  "news.tvbs.com.tw",
  "chinatimes.com",
  "nownews.com",
  "news.ttv.com.tw",
  "dramaqueen.com.tw",
];

const twEntertainmentTrackedPriorityDomains = [
  "tw.news.yahoo.com",
  "stars.udn.com",
  "udn.com",
  "cna.com.tw",
  "mirrordaily.news",
  "n.yam.com",
  "setn.com",
  "news.tvbs.com.tw",
  "news.ttv.com.tw",
];

const twEntertainmentTaiwanSignals = [
  "台灣", "臺灣", "台劇", "臺劇", "國片", "台片", "華語", "本土", "金馬", "金鐘", "北影", "台北電影", "台北", "臺北", "新北", "桃園", "台中", "臺中", "台南", "臺南", "高雄", "金門", "文策院", "文化部", "影視局", "公視", "台視", "臺視", "華視", "民視", "三立", "八大", "客家電視", "客台", "全國電影票房", "八點檔", "偶像劇", "影視基地", "殺青宴", "盧彥澤", "何宜珊", "林健寰", "尹昭德", "周渝民", "薛仕凌", "劉子銓", "白潤音", "詹懷雲", "温貞菱", "溫貞菱", "寶島西米樂", "我們與惡的距離", "便利商店1999", "便利商店", "不算AI情", "打狗", "哥哥可以跟我打勾勾嗎", "絕勝",
  "劇情片", "喜劇片", "愛情片", "動作片", "犯罪片", "懸疑片", "驚悚片", "恐怖片", "科幻片", "奇幻片", "冒險片", "災難片", "戰爭片", "歷史片", "傳記片", "音樂片", "歌舞片", "運動片", "家庭片", "青春片", "校園片", "公路片", "黑色電影", "超級英雄片", "動畫片", "紀錄片", "社會寫實片", "政治片", "法庭片", "警匪片", "黑幫片", "武俠片", "古裝片", "怪獸片", "喪屍片", "靈異片", "邪教片", "血腥片", "心理驚悚片", "女性電影", "兒童電影", "親子電影", "實驗電影", "短片",
];

const twEntertainmentForeignSignals = [
  "日本", "韓國", "韓星", "日劇", "韓劇", "好萊塢", "美國", "中國", "陸劇", "香港", "港片", "泰國", "越南", "法國", "英國", "紐倫堡", "雷米馬利克", "雷米馬利克", "羅素克洛", "羅素克洛",
];

const twEntertainmentDramaTopicSignals = [
  "台劇", "臺劇", "戲劇", "影集", "劇集", "劇組", "演員", "主演", "導演", "編劇", "製作人", "監製", "開拍", "開鏡", "開機", "殺青", "殺青宴", "定檔", "播出", "首播", "上架", "OTT", "Netflix", "Disney", "公視", "台視", "臺視", "華視", "民視", "三立", "八大", "客家電視", "八點檔", "金鐘", "周渝民", "薛仕凌", "劉子銓", "白潤音", "盧彥澤", "何宜珊", "林健寰", "尹昭德", "詹懷雲", "温貞菱", "溫貞菱", "寶島西米樂", "我們與惡的距離", "便利商店",
  "都會劇", "家庭劇", "職人劇", "愛情劇", "喜劇影集", "情境喜劇", "青春校園劇", "懸疑劇", "犯罪劇", "驚悚劇", "恐怖劇", "科幻劇", "奇幻劇", "歷史劇", "古裝劇", "武俠劇", "政治劇", "醫療劇", "律政劇", "警匪劇", "黑幫劇", "社會寫實劇", "女性成長劇", "BL劇", "GL劇", "偶像劇", "職場劇", "家庭倫理劇", "單元劇", "迷你劇", "長壽劇", "動畫影集", "紀錄影集", "實境影集", "綜藝節目", "選秀節目", "談話節目", "旅遊節目", "美食節目", "音樂節目", "兒少節目", "親子節目",
];

const twEntertainmentDramaStrongSignals = [
  "台劇", "臺劇", "影集", "劇集", "劇組", "八點檔", "偶像劇", "迷你劇", "單元劇", "長壽劇", "公視", "台視", "臺視", "華視", "民視", "三立戲劇", "八大戲劇", "客家電視", "OTT", "Netflix", "Disney", "LINE TV", "MyVideo", "friDay", "CATCHPLAY", "金鐘", "都會劇", "家庭劇", "職人劇", "愛情劇", "喜劇影集", "情境喜劇", "青春校園劇", "懸疑劇", "犯罪劇", "驚悚劇", "恐怖劇", "科幻劇", "奇幻劇", "歷史劇", "古裝劇", "武俠劇", "政治劇", "醫療劇", "律政劇", "警匪劇", "黑幫劇", "社會寫實劇", "女性成長劇", "BL劇", "GL劇", "職場劇", "家庭倫理劇", "動畫影集", "紀錄影集", "實境影集", "寶島西米樂", "我們與惡的距離", "便利商店",
];

const twEntertainmentDramaNoiseSignals = [
  "外送", "外送員", "雷區", "黃仁勳", "SK會長", "半導體", "科技業", "金融理財", "基金會", "反毒劇", "紙風車劇團", "校園巡演", "如何辨識台灣人", "大阪妹", "暴雨", "梅雨", "大雨特報", "雨衣", "機車族", "北投", "艾草", "粽子", "經痛", "止痛藥", "中醫", "生活 -", "社會 -", "產經 -",
];

const twEntertainmentFilmTopicSignals = [
  "電影", "國片", "台片", "臺片", "院線", "上映", "定檔", "預告", "海報", "劇照", "主視覺", "開拍", "開鏡", "開機", "殺青", "殺青宴", "導演", "編劇", "演員", "主演", "監製", "製片", "片商", "發行", "票房", "影展", "金馬", "北影", "台北電影", "金穗", "入圍", "得獎", "紀錄片", "劇情片", "喜劇片", "愛情片", "動作片", "犯罪片", "懸疑片", "驚悚片", "恐怖片", "科幻片", "奇幻片", "動畫片", "短片", "造山者", "不算AI情", "打狗", "哥哥可以跟我打勾勾嗎", "絕勝",
];

const twEntertainmentGeneralTopicSignals = [
  "影劇", "影視", "娛樂", "電影", "國片", "台片", "臺片", "院線", "上映", "定檔", "預告", "海報", "劇照", "主視覺", "票房", "影展", "金馬", "北影", "台北電影", "金穗", "金鐘", "入圍", "得獎", "文策院", "文化部", "影視局", "補助", "輔導金", "OTT", "Netflix", "Disney", "公視", "台視", "臺視", "華視", "民視", "八點檔", "影集", "劇集", "台劇", "臺劇",
];

const twEntertainmentGeneralNoiseSignals = [
  "模範女警", "警察節", "水蜜桃", "賄選", "地檢署", "好茶宣導", "城市科大", "畢典", "修車職人", "薪資", "天氣預報", "鋒面", "全台轉雨", "暴雨", "梅雨", "端午", "讀者投書", "醫美", "檢法醫界", "便利商店攜手環境部", "乘涼站", "攝影獎", "科技", "電力", "吸金", "檳榔攤", "酒駕", "異世界合成圖", "資安", "微軟", "零信任", "國安情資", "相關新聞報導 第1頁", "雨彈", "淹水", "國民黨", "民進黨", "毒駕", "世足",
];

function decodeBasicHtml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizeNewsDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function rangeQuery(range) {
  if (range === "today") return "when:1d";
  if (range === "7d") return "when:7d";
  if (range === "30d") return "when:30d";
  if (range === "year") return "when:365d";
  return "when:7d";
}

function rangeDays(range) {
  if (range === "today") return 1;
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "year") return 365;
  return 7;
}

function isNewsDateWithinRange(value, range) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeDays(range) - 1));
  return date >= start && date <= now;
}

function inferEntertainmentCategory(text) {
  const haystack = String(text || "");
  if (/票房|賣座|全國電影票房/.test(haystack)) return "票房";
  if (/文策院|文化部|補助|產業|政策|影視局/.test(haystack)) return "產業";
  if (/OTT|Netflix|Disney|影集|台劇|劇集|上架/.test(haystack)) return "影集";
  if (/社群|Dcard|Threads|Instagram|Facebook|口碑|討論/.test(haystack)) return "社群口碑";
  return "電影";
}

function inferEntertainmentTags(text, resultType = "news") {
  const haystack = String(text || "");
  const tags = [];
  if (resultType === "social") tags.push("社群");
  if (/影集|台劇|劇集|OTT/.test(haystack)) tags.push("影集");
  else if (!tags.includes("社群")) tags.push("電影");
  tags.push("台灣");
  if (/開拍|開鏡/.test(haystack)) tags.push("開拍");
  else if (/殺青/.test(haystack)) tags.push("殺青");
  else if (/定檔|上映|檔期/.test(haystack)) tags.push("定檔");
  else if (/票房/.test(haystack)) tags.push("票房");
  else if (/預告/.test(haystack)) tags.push("預告");
  else if (/海報|主視覺/.test(haystack)) tags.push("海報");
  else if (/文策院|文化部|補助|政策/.test(haystack)) tags.push("產業");
  else if (resultType === "social") tags.push("討論");
  return [...new Set(tags)];
}

function inferUsefulFor(text, resultType = "news") {
  const haystack = String(text || "");
  if (resultType === "social") {
    if (/爭議|負評|炎上|危機/.test(haystack)) return ["危機觀察", "口碑追蹤"];
    if (/留言|回覆|討論/.test(haystack)) return ["口碑追蹤", "留言回覆參考"];
    return ["社群靈感", "口碑追蹤"];
  }
  if (/開拍|開鏡|殺青/.test(haystack)) return ["開拍追蹤", "日報整理"];
  if (/定檔|上映|檔期/.test(haystack)) return ["定檔追蹤", "社群靈感"];
  if (/票房/.test(haystack)) return ["票房觀察", "日報整理"];
  if (/文策院|文化部|補助|產業/.test(haystack)) return ["產業資料", "題材趨勢"];
  return ["日報整理", "社群靈感"];
}

function stripLowRelatedResults(items) {
  const filtered = [];
  let excludedCount = 0;
  for (const item of items) {
    const text = `${item.title || ""} ${item.snippet || ""} ${item.summary || ""}`;
    const url = `${item.articleUrl || ""} ${item.postUrl || ""}`;
    if (twEntertainmentExcludedKeywords.some((keyword) => text.includes(keyword)) || twEntertainmentUnsafeSocialUrlPatterns.some((pattern) => pattern.test(url))) {
      excludedCount += 1;
    } else {
      filtered.push(item);
    }
  }
  return { filtered, excludedCount };
}

function hasTaiwanDramaSearchContext(text) {
  const value = String(text || "");
  if (twEntertainmentDramaNoiseSignals.some((signal) => value.includes(signal))) return false;
  if (twEntertainmentDramaStrongSignals.some((signal) => value.includes(signal))) return true;

  const hasProductionSignal = /開拍|開鏡|開機|殺青|殺青宴|定檔|播出|首播|上架/.test(value);
  const hasDramaWorkSignal = /影集|劇集|劇組|八點檔|偶像劇|迷你劇|單元劇|長壽劇|台劇|臺劇/.test(value);
  return hasProductionSignal && hasDramaWorkSignal;
}

function hasGeneralEntertainmentSearchContext(text) {
  const value = String(text || "");
  if (twEntertainmentGeneralNoiseSignals.some((signal) => value.includes(signal))) return false;
  if (twEntertainmentFilmTopicSignals.some((signal) => value.includes(signal))) return true;
  if (hasTaiwanDramaSearchContext(value)) return true;
  return twEntertainmentGeneralTopicSignals.some((signal) => value.includes(signal));
}

function isBroadTwEntertainmentPreset(keyword) {
  return /今日影劇|台灣電影|臺灣電影|國片|台片|台劇|臺劇|OTT|票房|開拍|開鏡|殺青|定檔|上映|文策院|文化部|補助|影展|獎項/.test(String(keyword || ""));
}

function keywordAppearsInText(keyword, text) {
  const value = String(text || "");
  return String(keyword || "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .some((token) => value.includes(token));
}

function hasTaiwanEntertainmentContext(raw, source) {
  const text = `${raw?.title || ""} ${raw?.sourceName || ""} ${source?.name || ""}`;
  const query = String(raw?.searchKeyword || "");
  if (!isBroadTwEntertainmentPreset(query)) {
    return keywordAppearsInText(query, text);
  }

  const domain = String(source?.domain || "");
  if (twEntertainmentOfficialDomains.includes(domain)) return true;

  if (/今日影劇/.test(query)) {
    return hasGeneralEntertainmentSearchContext(text);
  }
  if (/台劇|臺劇/.test(query)) {
    return hasTaiwanDramaSearchContext(text);
  }

  const hasTaiwanSignal = twEntertainmentTaiwanSignals.some((signal) => text.includes(signal));
  if (hasTaiwanSignal) return true;

  const hasForeignSignal = twEntertainmentForeignSignals.some((signal) => text.includes(signal));
  if (hasForeignSignal) return false;

  if (/台灣電影|臺灣電影|國片|台片/.test(query)) {
    return false;
  }

  if (twEntertainmentTrustedTaiwanMediaDomains.includes(domain) && /台劇|臺劇/.test(query) && hasTaiwanDramaSearchContext(text)) {
    return true;
  }

  if (domain === "atmovies.com.tw" && /電影版|劇場版|正式預告|電影預告|預告/.test(text)) {
    return false;
  }

  return false;
}

function matchesSearchIntent(raw, keyword) {
  const text = `${raw?.title || ""} ${raw?.sourceName || ""}`;
  const query = String(keyword || "");
  if (/今日影劇/.test(query) && !hasGeneralEntertainmentSearchContext(text)) {
    return false;
  }
  if (/台灣電影|臺灣電影|國片|台片/.test(query) && !twEntertainmentFilmTopicSignals.some((signal) => text.includes(signal))) {
    return false;
  }
  if (/台劇|臺劇/.test(query) && !hasTaiwanDramaSearchContext(text)) {
    return false;
  }
  const intentGroups = [
    { query: /開拍|開鏡/, result: /開拍|開鏡|開機|開工|開鏡/ },
    { query: /殺青/, result: /殺青|殺青宴/ },
    { query: /定檔/, result: /定檔|檔期/ },
    { query: /上映/, result: /上映|院線|戲院|大銀幕/ },
    { query: /票房/, result: /票房|賣座|排行|全國電影票房/ },
    { query: /補助/, result: /補助|輔導金|投資|徵件/ },
    { query: /影展/, result: /影展|金馬奇幻|台北電影節|金穗|入選/ },
    { query: /獎項/, result: /獎項|入圍|得獎|金馬|金鐘|金穗/ },
  ];
  const activeGroups = intentGroups.filter((group) => group.query.test(query));
  if (!activeGroups.length) return true;
  return activeGroups.some((group) => group.result.test(text));
}

function stripNewsSourceSuffix(title) {
  return String(title || "")
    .replace(/\s[-－]\s*(Yahoo新聞|Yahoo奇摩新聞|鏡週刊Mirror Media|鏡週刊|Mirror Media|聯合新聞網|噓！星聞|ETtoday星光雲|ETtoday新聞雲|三立新聞網|自由娛樂|中央社|TVBS新聞網|中時新聞網|NOWnews今日新聞|台視新聞網|華視新聞網)\s*$/i, "")
    .trim();
}

function normalizeResultTitleKey(title) {
  return stripNewsSourceSuffix(title)
    .replace(/\s+/g, "")
    .replace(/[｜|:：\-－_—–‧·・,，.。!！?？「」『』【】\[\]（）()]/g, "")
    .replace(/鏡大咖/g, "")
    .toLowerCase()
    .trim();
}

function normalizeEventTitleKey(title) {
  const normalized = normalizeResultTitleKey(title)
    .replace(/20\d{2}/g, "")
    .replace(/第\d+度|第\d+年|第\d+屆|第\d+週年|\d+週年|\d+部|\d+年/g, "")
    .replace(/啟航|邁入|攜手|飛向世界|飛向國際|登長榮航班|登機上娛樂系統|隨航線|紀錄片|國際|世界|歡慶|舉辦|舉行|正式|新聞|報導/g, "");

  if (normalized.includes("新北") && normalized.includes("天際影展") && normalized.includes("長榮")) {
    return "新北天際影展長榮航空";
  }
  return normalized.slice(0, 18);
}

function dedupeTwEntertainmentResults(items, urlKey) {
  const byUrl = new Set();
  const byTitle = new Set();
  const byEvent = new Set();
  const results = [];
  for (const item of items) {
    const url = String(item[urlKey] || item.articleUrl || item.postUrl || "").trim();
    const titleKey = normalizeResultTitleKey(item.title || item.relatedTitle);
    const eventKey = normalizeEventTitleKey(item.title || item.relatedTitle);
    if (url && byUrl.has(url)) continue;
    if (titleKey && byTitle.has(titleKey)) continue;
    if (eventKey && eventKey.length >= 8 && byEvent.has(eventKey)) continue;
    if (url) byUrl.add(url);
    if (titleKey) byTitle.add(titleKey);
    if (eventKey && eventKey.length >= 8) byEvent.add(eventKey);
    results.push(item);
  }
  return results;
}

async function fetchGoogleNewsRss(query, limit = 5) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "MovieSocialOps/1.0 (+https://movie-social-system.onrender.com)",
      Accept: "application/rss+xml,text/xml,*/*",
    },
  });
  if (!response.ok) return [];
  const xml = await response.text();
  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return itemBlocks.slice(0, limit).map((item) => {
    const title = decodeBasicHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
    const link = decodeBasicHtml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1]);
    const pubDate = decodeBasicHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]);
    const sourceName = decodeBasicHtml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]);
    return { title, link, publishedDate: normalizeNewsDate(pubDate), sourceName };
  }).filter((item) => item.title && item.link);
}

function normalizeTwNewsItem(raw, source, keyword) {
  const cleanTitle = stripNewsSourceSuffix(raw.title);
  const text = `${cleanTitle} ${source.name} ${keyword}`;
  const tags = inferEntertainmentTags(text, "news");
  return {
    resultType: "news",
    title: cleanTitle,
    sourceName: source.name || raw.sourceName || "新聞來源",
    platform: "",
    accountName: "",
    articleUrl: raw.link,
    postUrl: "",
    publishedDate: raw.publishedDate,
    relatedTitle: "",
    category: inferEntertainmentCategory(text),
    tags,
    snippet: cleanTitle,
    aiSummary: `這則結果與「${keyword}」相關，建議開啟原文確認細節、日期與作品資訊。`,
    keyPoint: tags.includes("產業") ? "可先作為產業資料保存，再判斷是否需要追蹤後續公告。" : "可先確認是否包含開拍、定檔、預告、票房或宣傳節點。",
    usefulFor: inferUsefulFor(text, "news"),
    interactionObservation: "",
    note: raw.link.includes("news.google.com") ? "Google News RSS 可能提供新聞轉址，開啟後可再進原站。" : "",
    rawContent: raw.title,
    searchKeyword: keyword,
  };
}

function shouldKeepTwEntertainmentNewsItem(raw, source, keyword = "") {
  const link = String(raw?.link || "");
  if (!link) return false;
  if (twEntertainmentUnsafeSocialUrlPatterns.some((pattern) => pattern.test(link))) {
    return false;
  }
  if (source.domain === "mirrormedia.mg" && /\/external\//i.test(link)) {
    return false;
  }
  if (!hasTaiwanEntertainmentContext({ ...raw, searchKeyword: keyword }, source)) {
    return false;
  }
  if (!matchesSearchIntent(raw, keyword)) {
    return false;
  }
  return true;
}

function buildSocialSearchEntry(source, keyword) {
  const query = `site:${source.domain} ${keyword}`;
  const searchUrl = source.searchUrl || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const title = `${source.platform}｜${keyword} 搜尋入口`;
  const text = `${title} ${keyword}`;
  return {
    resultType: "social",
    title,
    sourceName: source.platform,
    platform: source.platform,
    accountName: source.accountName,
    articleUrl: "",
    postUrl: searchUrl,
    publishedDate: "",
    relatedTitle: keyword,
    category: "社群口碑",
    tags: inferEntertainmentTags(text, "social"),
    snippet: `此平台較難由後端直接穩定爬取，先提供指定站台搜尋入口。`,
    aiSummary: `可用這個入口快速查 ${source.platform} 上與「${keyword}」相關的公開討論或貼文。`,
    keyPoint: "封閉式社群平台需要外部搜尋或正式 API，這裡先提供可開啟的搜尋入口。",
    usefulFor: ["口碑追蹤", "社群靈感"],
    interactionObservation: "需進入平台後人工確認互動量、留言方向與是否有口碑訊號。",
    note: "不是假貼文，這是平台搜尋入口。",
    rawContent: source.searchUrl ? `${source.platform} 固定入口：${source.searchUrl}` : query,
    searchKeyword: keyword,
  };
}

function buildDcardSocialEntry(keyword) {
  const isDramaSearch = /台劇|臺劇/.test(String(keyword || ""));
  const dcardUrl = isDramaSearch ? "https://www.dcard.tw/topics/%E5%8F%B0%E5%8A%87" : "https://www.dcard.tw/f/movie";
  const dcardLabel = isDramaSearch ? "Dcard 台劇話題" : "Dcard 電影版";
  return {
    resultType: "social",
    title: `${dcardLabel}｜${keyword}`,
    sourceName: "Dcard",
    platform: "Dcard",
    accountName: dcardLabel,
    articleUrl: "",
    postUrl: dcardUrl,
    publishedDate: "",
    relatedTitle: keyword,
    category: "社群口碑",
    tags: inferEntertainmentTags(`Dcard ${keyword}`, "social"),
    snippet: "Dcard 以固定入口提供社群討論線索，避免跳到不相關看板。",
    aiSummary: `可用這個入口快速查看 Dcard 上與「${keyword}」相關的公開討論。`,
    keyPoint: isDramaSearch ? "Dcard 台劇搜尋固定連到台劇話題頁。" : "Dcard 台灣電影搜尋固定連到電影版。",
    usefulFor: ["口碑追蹤", "社群靈感"],
    interactionObservation: "請進入 Dcard 後，再用站內搜尋或瀏覽最新討論確認口碑方向。",
    note: `固定入口：${dcardLabel}。`,
    rawContent: `${dcardLabel} 固定入口：${dcardUrl}`,
    searchKeyword: keyword,
  };
}

async function fetchTwEntertainmentNewsResults(keyword, range, options = {}) {
  const allResults = [];
  const sourceLimit = options.sourceLimit || 10;
  const sources = options.sources || twEntertainmentNewsSources;
  for (const source of sources) {
    const searchKeyword = /今日影劇/.test(String(keyword || ""))
      ? "(台灣電影 OR 台劇 OR 影集 OR OTT OR 影視產業 OR 票房 OR 影展)"
      : keyword;
    const sourceQuery = `${searchKeyword} site:${source.domain} ${rangeQuery(range)}`.trim();
    try {
      const rows = await fetchGoogleNewsRss(sourceQuery, sourceLimit);
      allResults.push(...rows.filter((row) => isNewsDateWithinRange(row.publishedDate, range)).filter((row) => shouldKeepTwEntertainmentNewsItem(row, source, keyword)).map((row) => normalizeTwNewsItem(row, source, keyword)));
    } catch (error) {
      console.warn("[TW_NEWS_SOURCE_SKIPPED]", source.name, error.message);
    }
  }
  return dedupeTwEntertainmentResults(allResults, "articleUrl").slice(0, 50);
}

function parseTrackedKeywords(value) {
  return [...new Set(String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean))]
    .slice(0, 8);
}

function buildTrackedSearchQueries(keyword, trackedKeywords) {
  const baseKeyword = String(keyword || "").trim();
  return trackedKeywords
    .filter((tracked) => !baseKeyword.includes(tracked))
    .map((tracked) => `${tracked} ${baseKeyword}`.trim());
}

async function fetchTwEntertainmentTrackedNewsResults(keyword, range, trackedKeywords) {
  const trackedQueries = buildTrackedSearchQueries(keyword, trackedKeywords);
  if (!trackedQueries.length) return [];
  const prioritySources = twEntertainmentNewsSources.filter((source) => twEntertainmentTrackedPriorityDomains.includes(source.domain));
  const batches = await Promise.all(trackedQueries.map((query) => fetchTwEntertainmentNewsResults(query, range, {
    sources: prioritySources,
    sourceLimit: 6,
  })));
  return dedupeTwEntertainmentResults(batches.flat(), "articleUrl").slice(0, 50);
}

async function fetchTwEntertainmentSocialResults(keyword, range) {
  const results = [];
  const dcardSource = twEntertainmentSocialSources.find((source) => source.platform === "Dcard");
  if (dcardSource) {
    results.push(buildDcardSocialEntry(keyword));
  }

  for (const source of twEntertainmentSocialSources.filter((item) => item.platform !== dcardSource?.platform)) {
    results.push(buildSocialSearchEntry(source, keyword));
  }

  return dedupeTwEntertainmentResults(results, "postUrl").slice(0, 40);
}

function fallbackTwEntertainmentAiNotes(keyword, newsResults, socialResults) {
  const firstNews = newsResults[0]?.title || "新聞來源";
  const firstSocial = socialResults[0]?.platform || "社群來源";
  return [
    { title: "本次最值得注意的 3 件事", items: [`先確認「${keyword}」相關的最新新聞是否包含定檔、開拍或票房節點。`, `${firstNews} 可作為第一筆追蹤素材。`, `${firstSocial} 可補充口碑與討論方向。`] },
    { title: "可做成社群內容的題材", items: ["定檔或預告發布可延伸成倒數貼文。", "開拍／殺青資訊可整理成作品追蹤。", "社群討論可轉成互動題或留言回覆素材。"] },
    { title: "值得追蹤的作品／公司／人物", items: ["本次搜尋中反覆出現的作品名稱。", "發布新聞的片方、平台或影視單位。", "社群留言裡被重複提到的人物或題材。"] },
    { title: "需要後續追蹤", items: ["是否有正式海報、預告或主視覺釋出。", "社群討論是否持續升溫或出現爭議。", "票房或上架後的第二波新聞。"] },
  ];
}

async function organizeTwEntertainmentResultsWithAi(keyword, newsResults, socialResults) {
  const apiKey = envValue("OPENAI_API_KEY");
  if (!apiKey) return { aiNotes: fallbackTwEntertainmentAiNotes(keyword, newsResults, socialResults), aiFailed: true };

  const compactResults = [...newsResults.slice(0, 8), ...socialResults.slice(0, 6)].map((item) => ({
    type: item.resultType,
    title: item.title,
    source: item.sourceName || item.platform,
    date: item.publishedDate,
    snippet: item.snippet,
    tags: item.tags,
  }));

  const prompt = `
你是影視小編自己的資料整理助手。請根據搜尋結果整理工作用重點，不要寫老闆視角、公司決策、商業策略或公司可參考處。
請使用繁體中文，不要照抄原文，不要八卦口吻。

搜尋關鍵字：${keyword}
搜尋結果：
${JSON.stringify(compactResults, null, 2)}

請只回傳 JSON：
{
  "notes": [
    {"title":"本次搜尋最值得注意的 3 件事","items":["...","...","..."]},
    {"title":"可做成社群內容的題材","items":["...","...","..."]},
    {"title":"值得追蹤的作品／公司／人物","items":["...","...","..."]},
    {"title":"需要後續追蹤","items":["...","...","..."]}
  ],
  "enhancements": [
    {"title":"結果標題","aiSummary":"60到120字摘要","keyPoint":"這篇重點","usefulFor":["日報整理"],"interactionObservation":"社群才需要，新聞可空白"}
  ]
}`;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: envValue("OPENAI_MODEL") || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "你只使用繁體中文，協助影視工作者整理搜尋資料。" },
        { role: "user", content: prompt },
      ],
    });
    const text = completion.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
    const enhancements = Array.isArray(parsed.enhancements) ? parsed.enhancements : [];
    for (const item of [...newsResults, ...socialResults]) {
      const matched = enhancements.find((entry) => entry.title && item.title && String(item.title).includes(String(entry.title).slice(0, 12)));
      if (matched) {
        item.aiSummary = matched.aiSummary || item.aiSummary;
        item.keyPoint = matched.keyPoint || item.keyPoint;
        item.usefulFor = Array.isArray(matched.usefulFor) && matched.usefulFor.length ? matched.usefulFor : item.usefulFor;
        if (item.resultType === "social") item.interactionObservation = matched.interactionObservation || item.interactionObservation;
      }
    }
    return { aiNotes: Array.isArray(parsed.notes) ? parsed.notes : fallbackTwEntertainmentAiNotes(keyword, newsResults, socialResults), aiFailed: false };
  } catch (error) {
    console.warn("[TW_ENTERTAINMENT_AI_FALLBACK]", error.message);
    return { aiNotes: fallbackTwEntertainmentAiNotes(keyword, newsResults, socialResults), aiFailed: true };
  }
}

async function saveTwEntertainmentItems(items) {
  const saved = [];
  for (const item of items) {
    const url = item.resultType === "social" ? item.postUrl : item.articleUrl;
    if (!url) continue;
    try {
      const encodedUrl = encodeURIComponent(url);
      const column = item.resultType === "social" ? "post_url" : "article_url";
      const existing = await supabaseRequest(`/tw_entertainment_news_items?${column}=eq.${encodedUrl}&select=id&limit=1`);
      if (Array.isArray(existing) && existing.length) continue;
      await supabaseRequest("/tw_entertainment_news_items", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          result_type: item.resultType,
          title: item.title,
          source_name: item.sourceName,
          platform: item.platform,
          account_name: item.accountName,
          article_url: item.articleUrl,
          post_url: item.postUrl,
          published_date: item.publishedDate || null,
          related_title: item.relatedTitle,
          category: item.category,
          tags: item.tags,
          snippet: item.snippet,
          ai_summary: item.aiSummary,
          key_point: item.keyPoint,
          useful_for: item.usefulFor,
          interaction_observation: item.interactionObservation,
          note: item.note,
          raw_content: item.rawContent,
          search_keyword: item.searchKeyword,
        }),
      });
      saved.push(url);
    } catch (error) {
      console.warn("[TW_ENTERTAINMENT_SAVE_SKIPPED]", error.message);
      break;
    }
  }
  return saved.length;
}

function sortTwEntertainmentItems(items, sort) {
  const sorted = [...items];
  if (sort === "source") sorted.sort((a, b) => String(a.sourceName || a.platform).localeCompare(String(b.sourceName || b.platform), "zh-Hant"));
  else if (sort === "title") sorted.sort((a, b) => String(a.title).localeCompare(String(b.title), "zh-Hant"));
  else sorted.sort((a, b) => String(b.publishedDate || "").localeCompare(String(a.publishedDate || "")));
  return sorted;
}

async function handleTwEntertainmentNewsSearch(request, response, url) {
  const keyword = String(url.searchParams.get("q") || "").trim();
  const range = String(url.searchParams.get("range") || "7d");
  const sort = String(url.searchParams.get("sort") || "latest");
  const includeSocial = String(url.searchParams.get("includeSocial") || "true") !== "false";
  const includeAi = String(url.searchParams.get("includeAi") || "true") !== "false";
  const trackedKeywords = parseTrackedKeywords(url.searchParams.get("trackedKeywords") || "");

  if (!keyword) {
    sendJson(response, 400, { error: "請先輸入搜尋關鍵字。" });
    return;
  }

  try {
    const [rawNewsResults, rawTrackedNewsResults, rawSocialResults] = await Promise.all([
      fetchTwEntertainmentNewsResults(keyword, range),
      fetchTwEntertainmentTrackedNewsResults(keyword, range, trackedKeywords),
      includeSocial ? fetchTwEntertainmentSocialResults(keyword, range) : Promise.resolve([]),
    ]);
    const newsFilter = stripLowRelatedResults([...rawNewsResults, ...rawTrackedNewsResults]);
    const socialFilter = stripLowRelatedResults(rawSocialResults);
    const newsResults = dedupeTwEntertainmentResults(sortTwEntertainmentItems(newsFilter.filtered, sort), "articleUrl").slice(0, 50);
    const socialResults = dedupeTwEntertainmentResults(sortTwEntertainmentItems(socialFilter.filtered, sort), "postUrl").slice(0, 40);
    const { aiNotes, aiFailed } = includeAi
      ? await organizeTwEntertainmentResultsWithAi(keyword, newsResults, socialResults)
      : { aiNotes: [], aiFailed: false };
    const savedCount = await saveTwEntertainmentItems([...newsResults, ...socialResults]).catch(() => 0);
    const categoryCounts = {};
    for (const item of [...newsResults, ...socialResults]) categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;

    sendJson(response, 200, {
      summary: {
        keyword,
        trackedKeywords,
        trackedKeywordCount: trackedKeywords.length,
        range,
        sort,
        searchedAt: new Date().toISOString(),
        newsCount: newsResults.length,
        socialCount: socialResults.length,
        excludedCount: newsFilter.excludedCount + socialFilter.excludedCount,
        categoryCounts,
        focusPoints: fallbackTwEntertainmentAiNotes(keyword, newsResults, socialResults)[0].items,
        savedCount,
        aiFailed,
      },
      newsResults,
      socialResults,
      aiNotes,
      limitations: [
        "新聞來源目前使用 Google News RSS 指定站台搜尋；部分連結可能先經 Google News 轉址。",
        "Instagram、Facebook、Threads 屬封閉平台，第一版提供站台搜尋入口，不直接冒充貼文爬取。",
        "Dcard 以公開搜尋結果為主，仍需開啟原文確認互動數與留言方向。",
      ],
    });
  } catch (error) {
    console.error("[TW_ENTERTAINMENT_SEARCH_FAILED]", error);
    sendJson(response, error.statusCode || 500, { error: error.message || "影劇新聞搜尋失敗，請稍後再試。" });
  }
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/auth-status") {
    handleAuthStatus(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    handleAuthLogin(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    handleAuthLogout(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/test-openai") {
    testOpenAI(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tw-entertainment-news/search") {
    handleTwEntertainmentNewsSearch(request, response, url);
    return;
  }

  if (url.pathname.startsWith("/api/") && !isAuthenticated(request)) {
    sendUnauthorized(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analyze-social-link") {
    analyzeSocialLink(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/config-status") {
    configStatus(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/openai-status") {
    openaiStatus(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sync-status") {
    syncStatus(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-copy") {
    generateCopy(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-question-tool") {
    generateQuestionTool(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-question-batch") {
    generateQuestionBatch(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-analytics-conclusion") {
    generateAnalyticsConclusion(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-post-insight") {
    generatePostInsightStrict(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-period-insight") {
    generatePeriodInsightSafe(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/analyze-post") {
    analyzePost(request, response, { readJsonBody, sendJson, envValue, loadRelevantStyleExamples });
    return;
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/ai/movie-editor/")) {
    const taskName = decodeURIComponent(url.pathname.replace("/api/ai/movie-editor/", ""));
    runMovieEditorApi(request, response, { readJsonBody, sendJson, envValue, loadRelevantStyleExamples }, taskName);
    return;
  }

  if (url.pathname === "/api/ai-style-examples") {
    handleStyleExamplesApi(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/ai-style-examples/")) {
    const exampleId = decodeURIComponent(url.pathname.replace("/api/ai-style-examples/", ""));
    handleStyleExamplesApi(request, response, exampleId);
    return;
  }

  if (url.pathname === "/api/movies") {
    handleMoviesApi(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/movies/")) {
    const movieId = decodeURIComponent(url.pathname.replace("/api/movies/", ""));
    handleMoviesApi(request, response, movieId);
    return;
  }

  if (url.pathname === "/api/project-boards") {
    handleProjectBoardsApi(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/project-boards/")) {
    const boardId = decodeURIComponent(url.pathname.replace("/api/project-boards/", ""));
    handleProjectBoardsApi(request, response, boardId);
    return;
  }

  if (url.pathname === "/api/social-analytics" || url.pathname.startsWith("/api/social-analytics/")) {
    handleSocialAnalyticsApi(request, response, url);
    return;
  }

  if (url.pathname === "/api/workflow-data") {
    handleWorkflowDataApi(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/workflow-data/")) {
    const kind = decodeURIComponent(url.pathname.replace("/api/workflow-data/", ""));
    handleWorkflowDataApi(request, response, kind);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
});

server.listen(port, host, () => {
  console.log(`Movie Social Ops running at http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/`);
});

