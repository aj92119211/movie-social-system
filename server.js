const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
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

function envValue(key) {
  return String(process.env[key] || "").trim();
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

async function loadRelevantStyleExamples(filters = {}) {
  try {
    const rows = await supabaseRequest("/ai_style_examples?select=*&limit=200");
    const examples = (rows || []).map(mapStyleExampleFromDb).filter((example) => example.isActive !== false);
    const normalized = {
      type: String(filters.type || "").toLowerCase(),
      platform: String(filters.platform || "").toLowerCase(),
      movieGenre: String(filters.movieGenre || filters.genre || "").toLowerCase(),
      campaignStage: String(filters.campaignStage || filters.stage || "").toLowerCase(),
      tone: String(filters.tone || "").toLowerCase(),
    };

    return examples
      .map((example) => {
        const fields = {
          type: String(example.type || "").toLowerCase(),
          platform: String(example.platform || "").toLowerCase(),
          movieGenre: String(example.movieGenre || "").toLowerCase(),
          campaignStage: String(example.campaignStage || "").toLowerCase(),
          tone: String(example.tone || "").toLowerCase(),
        };
        const matchScore = Object.entries(normalized).reduce((total, [key, value]) => {
          if (!value) return total;
          return total + (fields[key] && (fields[key].includes(value) || value.includes(fields[key])) ? 1 : 0);
        }, 0);
        const qualityScore = Number(example.score || 3) / 5;
        return { example, score: matchScore * 10 + qualityScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
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
  const styleExamples = await loadRelevantStyleExamples({
    type: "貼文",
    platform: "通用",
    movieGenre: movie.genre,
    campaignStage: body.focus,
    tone: movie.socialTone,
  });
  const prompt = [
    `電影：${movie.title || "未命名電影"}`,
    `類型：${movie.genre || "未提供"}`,
    `社群語氣：${movie.socialTone || "未提供"}`,
    `核心賣點：${sellingPoints || "未提供"}`,
    `文案用途：通用社群文案，適合 FB、IG、Threads 使用`,
    `溝通重點：${body.focus || "請依電影資料產生社群宣傳文案"}`,
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
          "不要自行加入上映日期、上映時間、檔期或任何未在溝通重點中明確提供的日期資訊。社群語氣只代表文字風格，不代表日期資訊。",
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
          "你是影視社群互動題企劃。請使用繁體中文，根據電影資料產生 10 題新的互動問答題。題目要適合小編直接使用、不劇透、角度多元，並提供題型、平台、語氣、宣傳階段、CTA、建議素材與備註。只回傳符合 schema 的 JSON。",
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
                      type: { type: "string" },
                      platform: { type: "string" },
                      tone: { type: "string" },
                      phase: { type: "string" },
                      cta: { type: "string" },
                      asset: { type: "string" },
                      note: { type: "string" },
                    },
                    required: ["content", "type", "platform", "tone", "phase", "cta", "asset", "note"],
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

