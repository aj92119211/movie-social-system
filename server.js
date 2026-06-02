const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

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
    const counts = Object.fromEntries((collections || []).map((row) => [row.kind, Array.isArray(row.data) ? row.data.length : 0]));
    sendJson(response, 200, {
      movies: Array.isArray(movies) ? movies.length : 0,
      movieCovers: Array.isArray(moviesWithCover) ? moviesWithCover.length : 0,
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
  return {
    id: row.id,
    title: row.title,
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
    release_date: String(movie.releaseDate || "").replaceAll("/", "-"),
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

function validateMoviePayload(movie) {
  const requiredFields = ["title", "genre", "releaseDate", "socialTone"];
  for (const field of requiredFields) {
    if (!String(movie[field] || "").trim()) {
      return `${field} is required`;
    }
  }

  return "";
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

      const rows = await saveMovieToSupabase(`/movies?id=eq.${encodeURIComponent(movieId)}&select=*`, "PATCH", body);

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
  return {
    facebookPosts: Array.isArray(value?.facebookPosts) ? value.facebookPosts : [],
    igPosts: Array.isArray(value?.igPosts) ? value.igPosts : [],
    threadsPosts: Array.isArray(value?.threadsPosts) ? value.threadsPosts : [],
    storyQuestions: Array.isArray(value?.storyQuestions) ? value.storyQuestions : [],
    replySuggestions: Array.isArray(value?.replySuggestions) ? value.replySuggestions : [],
  };
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
  const prompt = [
    `電影：${movie.title || "未命名電影"}`,
    `類型：${movie.genre || "未提供"}`,
    `上映日期：${movie.releaseDate || "未提供"}`,
    `社群語氣：${movie.socialTone || "未提供"}`,
    `核心賣點：${sellingPoints || "未提供"}`,
    `目標平台：Facebook、Instagram、Threads`,
    `溝通重點：${body.focus || "請依電影資料產生上映宣傳文案"}`,
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
          "你是電影社群行銷文案企劃。請使用繁體中文，根據電影資料與溝通重點，一次產生 Facebook、IG、Threads 三個平台可使用的文章，並保留限時互動題與留言回覆建議。內容要自然、有宣傳節奏，避免劇透。只回傳符合 schema 的 JSON。",
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
                facebookPosts: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
                igPosts: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
                threadsPosts: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
                storyQuestions: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
                replySuggestions: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
              },
              required: ["facebookPosts", "igPosts", "threadsPosts", "storyQuestions", "replySuggestions"],
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
    const parsed = JSON.parse(outputText);
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
    const parsed = JSON.parse(outputText);
    sendJson(response, 200, normalizeQuestionToolPayload(parsed));
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "互動題 AI 產生失敗，請稍後再試。",
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
    openaiKeyPrefix: openaiApiKey ? openaiApiKey.slice(0, 8) : "",
    openaiKeyLength: openaiApiKey.length,
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

