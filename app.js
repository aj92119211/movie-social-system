const storageKeys = {
  covers: "movieSocialOps.movieCovers",
  movies: "movieSocialOps.movies",
  movieReleaseStatuses: "movieSocialOps.movieReleaseStatuses",
  activities: "movieSocialOps.activities",
  assets: "movieSocialOps.assets",
  schedules: "movieSocialOps.schedules",
  questions: "movieSocialOps.questions",
  metrics: "movieSocialOps.socialMetrics",
  postAnalyses: "movieSocialOps.postAnalyses",
  styleExamples: "movieSocialOps.aiStyleExamples",
  assetMovie: "movieSocialOps.selectedAssetMovie",
  scheduleMovie: "movieSocialOps.selectedScheduleMovie",
  analyticsMovie: "movieSocialOps.selectedAnalyticsMovie",
  copyMovie: "movieSocialOps.selectedCopyMovie",
  copyFocus: "movieSocialOps.copyFocus",
};

const workflowStorageKinds = {
  [storageKeys.assets]: "assets",
  [storageKeys.schedules]: "schedules",
  [storageKeys.activities]: "activities",
  [storageKeys.questions]: "questions",
  [storageKeys.metrics]: "socialMetrics",
  [storageKeys.postAnalyses]: "postAnalyses",
};

const mockData = {
  movies: [],
  assets: [
    {
      id: "ast-001",
      movieId: "mov-001",
      name: "主視覺海報 A 版",
      assetType: "海報",
      suitablePlatforms: ["Facebook", "Instagram"],
      spoilerLevel: "低",
      reviewStatus: "內部審核",
      linkUrl: "https://drive.google.com/",
      color: "#234a8f",
    },
    {
      id: "ast-002",
      movieId: "mov-001",
      name: "正式預告 30 秒",
      assetType: "影片",
      suitablePlatforms: ["YouTube", "Instagram Reels"],
      spoilerLevel: "中",
      reviewStatus: "片方審核",
      linkUrl: "https://drive.google.com/",
      color: "#0e7c86",
    },
  ],
  schedules: [
    {
      id: "sch-001",
      movieId: "mov-001",
      date: "2026/06/01",
      platform: "Facebook",
      topic: "正式預告上線",
      copy: "正式預告公開，倒數上映一起進入故事核心。",
      assetId: "ast-002",
      assetLinkUrl: "https://drive.google.com/",
      status: "已排程",
      owner: "行銷企劃",
    },
    {
      id: "sch-002",
      movieId: "mov-001",
      date: "2026/06/03",
      platform: "Instagram",
      topic: "角色金句圖",
      copy: "一句台詞，一個不能錯過的瞬間。",
      assetId: "ast-001",
      assetLinkUrl: "https://drive.google.com/",
      status: "製作中",
      owner: "社群小編",
    },
    {
      id: "sch-003",
      movieId: "mov-001",
      date: "2026/06/10",
      platform: "Threads",
      topic: "上映倒數互動",
      copy: "如果只能問導演一個問題，你會問什麼？",
      assetId: "ast-001",
      assetLinkUrl: "https://drive.google.com/",
      status: "草稿",
      owner: "社群小編",
    },
  ],
  activities: [
    {
      id: "act-001",
      movieId: "mov-001",
      title: "媒體試映會",
      location: "光點華山電影館",
      dateTime: "2026-06-08T14:00",
      attendees: "行銷企劃、片方窗口、媒體",
      note: "確認現場背板與媒體簽到流程。",
    },
    {
      id: "act-002",
      movieId: "mov-001",
      title: "主創直播訪談",
      location: "Facebook Live",
      dateTime: "2026-06-05T20:00",
      attendees: "導演、主演、社群小編",
      note: "準備留言互動題與導流 CTA。",
    },
  ],
  reviewItems: [
    { name: "正式預告貼文", reviewer: "品牌窗口", status: "已通過", note: "可排程發布" },
    { name: "角色海報", reviewer: "片方窗口", status: "修改中", note: "需更換第二張劇照" },
  ],
  questions: [
    {
      id: "q-001",
      content: "如果只能用一句話形容這部電影給你的感覺，你會怎麼說？",
      movieId: "",
      type: "開放問答",
      platform: "IG 限動",
      tone: "神祕",
      phase: "預告上線",
      status: "可使用",
      cta: "留言或回覆限動告訴我們",
      asset: "正式預告 30 秒",
      uses: 3,
      lastUsed: "2026/06/03",
      performance: "高",
      note: "適合搭配預告片或角色海報。",
      createdAt: "2026/06/01",
    },
    {
      id: "q-002",
      content: "你最想問主角哪一個問題？",
      movieId: "",
      type: "留言引導",
      platform: "Threads",
      tone: "親切",
      phase: "上映倒數",
      status: "草稿",
      cta: "在留言區留下你的問題",
      asset: "角色金句圖",
      uses: 1,
      lastUsed: "2026/06/05",
      performance: "中",
      note: "適合在上映前一週炒熱討論。",
      createdAt: "2026/06/02",
    },
    {
      id: "q-003",
      content: "看完這張劇照，你覺得下一秒會發生什麼事？",
      movieId: "",
      type: "二選一",
      platform: "Facebook",
      tone: "懸疑",
      phase: "口碑擴散",
      status: "可使用",
      cta: "選 A 或 B 並說明理由",
      asset: "劇照組圖",
      uses: 0,
      lastUsed: "",
      performance: "未測試",
      note: "可以搭配圖片輪播。",
      createdAt: "2026/06/04",
    },
  ],
  socialMetrics: [
    { movieId: "mov-001", platform: "Facebook", reach: 125000, impressions: 168000, views: 0, likes: 4300, comments: 280, shares: 620, saves: 740, newFollowers: 320, linkClicks: 860 },
    { movieId: "mov-001", platform: "Instagram", reach: 188000, impressions: 246000, views: 52000, likes: 9800, comments: 640, shares: 880, saves: 3980, newFollowers: 920, linkClicks: 1240 },
    { movieId: "mov-001", platform: "Threads", reach: 54000, impressions: 72000, views: 0, likes: 2100, comments: 360, shares: 190, saves: 260, newFollowers: 210, linkClicks: 300 },
  ],
  aiStyleExamples: [
    {
      id: "style-001",
      type: "貼文",
      platform: "Instagram",
      movieGenre: "驚悚",
      campaignStage: "上映中",
      tone: "神祕",
      exampleContent: "今晚你敢把燈關掉嗎？《鬼牽手》上映中，揪一位膽子最大的朋友一起進戲院。",
      whyItWorks: "用一句情境問題快速帶出恐怖片氣氛，也有明確揪團 CTA。",
      usageNote: "適合用在 IG 圖文或 Reels 文案開頭。",
      qualityTags: ["有記憶點", "適合互動"],
      useCase: "產生 IG 貼文",
      isActive: true,
      score: 5,
      aiInstruction: "模仿短句節奏，不要直接複製。",
    },
  ],
};

const pages = [
  { id: "dashboard", title: "首頁 Dashboard", icon: "首" },
  { id: "movies", title: "電影資料", icon: "片" },
  { id: "assets", title: "素材庫", icon: "素" },
  { id: "schedule", title: "社群排程", icon: "排" },
  { id: "copy", title: "AI 文案產生器", icon: "文" },
  { id: "style", title: "AI 風格範例庫", icon: "風" },
  { id: "review", title: "互動問答題庫", icon: "問" },
  { id: "analytics", title: "貼文數據分析", icon: "數" },
];

const colors = ["#234a8f", "#0e7c86", "#6d4c92", "#b86b00", "#168463", "#c84444"];
const scheduleStatuses = ["靈感", "草稿", "製作中", "內部審核", "片方審核", "已通過", "已排程", "已發布"];
const statusClass = { 已通過: "green", 已排程: "green", 已發布: "green", 可使用: "green", 高效題: "green", 啟用: "green", 上映中: "green", 未上映: "amber", 下檔: "red", 草稿: "amber", 靈感: "amber", 製作中: "blue", 內部審核: "amber", 片方審核: "amber", 修改中: "red", 停用: "red" };

let moviesLoadedFromServer = false;
let moviesLoading = false;
let moviesError = "";
const movieDemoModeMessage = "目前為 GitHub Pages 展示模式，電影資料會暫存在這台瀏覽器，不會永久同步到 Supabase。";
const movieSupabaseErrorMessage = "電影資料尚未連上 Supabase。請到 Render Environment Variables 檢查 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY；目前暫用瀏覽器資料顯示。";
let isMovieModalOpen = false;
let editingMovieId = null;
let movieReleaseStatusOverrides = {};
let isAssetModalOpen = false;
let editingAssetId = null;
let isScheduleModalOpen = false;
let editingScheduleId = null;
let currentScheduleWeekStart = null;
let isActivityModalOpen = false;
let editingActivityId = null;
let isQuestionModalOpen = false;
let editingQuestionId = null;
let isQuestionScheduleModalOpen = false;
let schedulingQuestionId = null;
let questionAiResult = null;
let isQuestionAiGenerating = false;
let isMetricModalOpen = false;
let editingMetricPlatform = null;
let analyticsReport = null;
let analyticsError = "目前使用手動數據分析模式，未串接外部社群數據服務。";
let savedPostAnalyses = [];
let postAnalysisResult = null;
let postAnalysisOutput = null;
let aiPostAnalysisText = "";
let aiPostAnalysisError = "";
let isAiPostAnalyzing = false;
let questionFilters = {
  search: "",
  movieId: "全部",
  platform: "全部",
  type: "全部",
  tone: "全部",
  phase: "全部",
  status: "全部",
  performance: "全部",
};
let styleExampleFilters = {
  search: "",
  type: "全部",
  platform: "全部",
  movieGenre: "全部",
  campaignStage: "全部",
};
let selectedAssetMovieId = localStorage.getItem(storageKeys.assetMovie) || "";
let selectedScheduleMovieId = localStorage.getItem(storageKeys.scheduleMovie) || "";
let selectedAnalyticsMovieId = localStorage.getItem(storageKeys.analyticsMovie) || "";
let selectedCopyMovieId = localStorage.getItem(storageKeys.copyMovie) || "";
let copyFocusValue = localStorage.getItem(storageKeys.copyFocus) || "正式預告上線、提醒上映日期、主打懸疑氛圍，語氣要精準但保留神祕感。";
let isCopyGenerating = false;
let copyGeneratorError = "";
let generatedCopyResult = null;
let styleExamplesLoading = false;
let styleExamplesLoadedFromServer = false;
let styleExamplesError = "";
let styleExamplesNotice = "";
let isStyleExampleModalOpen = false;
let editingStyleExampleId = null;
let isStyleExampleSaving = false;
let isTextComposing = false;
let authChecked = false;
let authRequired = false;
let isAuthenticated = false;
let authError = "";
let isAuthSubmitting = false;
let workflowLastLoadedAt = 0;
let moviesLastLoadedAt = 0;
const movieCoverPreviews = readStorage(storageKeys.covers, {});

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  syncWorkflowStorage(key, value);
}

function writeLocalStorageOnly(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function syncWorkflowStorage(key, value) {
  const kind = workflowStorageKinds[key];
  if (!kind || isGitHubPagesMode()) return;
  fetch(`/api/workflow-data/${encodeURIComponent(kind)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: value }),
  }).catch(() => {});
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-Hant-TW").format(value || 0);
}

function formatDateForInput(value) {
  return String(value || "").replaceAll("/", "-");
}

function formatDateForDisplay(value) {
  return String(value || "").replaceAll("-", "/");
}

function formatActivityDateTime(value) {
  if (!value) return "";
  const [datePart, timePart = ""] = String(value).split("T");
  return `${formatDateForDisplay(datePart)} ${timePart}`.trim();
}

function parseList(value) {
  return String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function option(value, currentValue, label = value) {
  return `<option value="${escapeHtml(value)}" ${value === currentValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function movieDisplayName(movie) {
  const name = movie?.title || movie?.name || movie?.movie_title || movie?.movieTitle || "";
  return String(name).trim() || "未命名電影";
}

function normalizeMovieRecord(movie) {
  return {
    ...movie,
    title: movieDisplayName(movie),
  };
}

function status(text) {
  return `<span class="status ${statusClass[text] || "blue"}">${escapeHtml(text)}</span>`;
}

function parseLocalDate(value) {
  const match = String(value || "").match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const [, yearValue, monthValue, dayValue] = match || [];
  const [year, month, day] = [yearValue, monthValue, dayValue].map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatWeekDate(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function getScheduleWeekStart() {
  if (currentScheduleWeekStart) return currentScheduleWeekStart;
  const first = mockData.schedules.map((item) => parseLocalDate(item.date)).filter(Boolean).sort((a, b) => a - b)[0];
  currentScheduleWeekStart = startOfWeek(first || new Date());
  return currentScheduleWeekStart;
}

function schedulesForCurrentWeek() {
  const start = getScheduleWeekStart();
  const end = addDays(start, 7);
  const selectedMovie = getSelectedScheduleMovie();
  return mockData.schedules
    .filter((item) => {
      const date = parseLocalDate(item.date);
      return date && date >= start && date < end && (!selectedMovie || scheduleMovieId(item) === selectedMovie.id);
    })
    .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
}

function normalizeSchedulesWithMovieIds(schedules) {
  const validMovieIds = new Set(mockData.movies.map((movie) => movie.id));
  const fallbackMovieId = selectedScheduleMovieId && validMovieIds.has(selectedScheduleMovieId) ? selectedScheduleMovieId : mockData.movies[0]?.id || "";
  let changed = false;
  const items = schedules.map((schedule) => {
    const assetMovieId = mockData.assets.find((asset) => asset.id === schedule.assetId)?.movieId || "";
    const currentMovieId = validMovieIds.has(schedule.movieId) ? schedule.movieId : "";
    const nextMovieId = currentMovieId || (validMovieIds.has(assetMovieId) ? assetMovieId : fallbackMovieId);
    if ((schedule.movieId || "") === nextMovieId) return schedule;
    changed = true;
    return { ...schedule, movieId: nextMovieId };
  });
  return { items, changed };
}

function normalizeAndPersistSchedules() {
  if (!mockData.movies.length || !mockData.schedules.length) return;
  const normalized = normalizeSchedulesWithMovieIds(mockData.schedules);
  if (!normalized.changed) return;
  mockData.schedules = normalized.items;
  writeStorage(storageKeys.schedules, mockData.schedules);
}

function normalizeActivitiesWithMovieIds(activities) {
  const validMovieIds = new Set(mockData.movies.map((movie) => movie.id));
  const fallbackMovieId = mockData.movies[0]?.id || "";
  let changed = false;
  const items = activities.map((activity) => {
    const currentMovieId = validMovieIds.has(activity.movieId) ? activity.movieId : "";
    const nextMovieId = currentMovieId || fallbackMovieId;
    if ((activity.movieId || "") === nextMovieId) return activity;
    changed = true;
    return { ...activity, movieId: nextMovieId };
  });
  return { items, changed };
}

function normalizeAndPersistActivities() {
  if (!mockData.movies.length || !mockData.activities.length) return;
  const normalized = normalizeActivitiesWithMovieIds(mockData.activities);
  if (!normalized.changed) return;
  mockData.activities = normalized.items;
  writeStorage(storageKeys.activities, mockData.activities);
}

function normalizeAnalyticsWithMovieIds() {
  if (!mockData.movies.length) return;
  const validMovieIds = new Set(mockData.movies.map((movie) => movie.id));
  const fallbackMovieId = selectedAnalyticsMovieId && validMovieIds.has(selectedAnalyticsMovieId) ? selectedAnalyticsMovieId : mockData.movies[0]?.id || "";
  let metricsChanged = false;
  mockData.socialMetrics = mockData.socialMetrics.map((metric) => {
    const currentMovieId = validMovieIds.has(metric.movieId) ? metric.movieId : "";
    const nextMovieId = currentMovieId || fallbackMovieId;
    const normalized = {
      ...metric,
      movieId: nextMovieId,
      impressions: Number(metric.impressions || 0),
      views: Number(metric.views || 0),
      linkClicks: Number(metric.linkClicks || 0),
    };
    if (metric.movieId !== normalized.movieId || metric.impressions !== normalized.impressions || metric.views !== normalized.views) metricsChanged = true;
    return normalized;
  });
  let analysesChanged = false;
  savedPostAnalyses = savedPostAnalyses.map((analysis) => {
    const currentMovieId = validMovieIds.has(analysis.movieId) ? analysis.movieId : "";
    const nextMovieId = currentMovieId || (validMovieIds.has(analysis.data?.movieId) ? analysis.data.movieId : fallbackMovieId);
    if (analysis.movieId === nextMovieId && analysis.data?.movieId === nextMovieId) return analysis;
    analysesChanged = true;
    return { ...analysis, movieId: nextMovieId, data: { ...(analysis.data || {}), movieId: nextMovieId } };
  });
  if (metricsChanged) writeStorage(storageKeys.metrics, mockData.socialMetrics);
  if (analysesChanged) writeStorage(storageKeys.postAnalyses, savedPostAnalyses);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("封面讀取失敗，請重新選擇圖片。")));
    reader.readAsDataURL(file);
  });
}

async function fileToCompressedCoverDataUrl(file) {
  const sourceUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxWidth = 900;
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    });
    image.addEventListener("error", () => reject(new Error("封面壓縮失敗，請重新選擇圖片。")));
    image.src = sourceUrl;
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "請求失敗，請稍後再試。");
  return payload;
}

function authPage() {
  return `
    <section class="auth-shell">
      <form id="authForm" class="card auth-card">
        <div class="card-body form-stack">
          <div>
            <p class="eyebrow">權限驗證</p>
            <h2>請先登入</h2>
            <p class="muted">輸入帳號密碼後才能檢視與編輯系統資料。</p>
          </div>
          <div class="field"><label>帳號</label><input class="input" name="username" autocomplete="username" required /></div>
          <div class="field"><label>密碼</label><input class="input" name="password" type="password" autocomplete="current-password" required /></div>
          <button class="primary-button" type="submit" ${isAuthSubmitting ? "disabled" : ""}>${isAuthSubmitting ? "登入中..." : "登入"}</button>
          ${authError ? `<p class="status red">${escapeHtml(authError)}</p>` : ""}
        </div>
      </form>
    </section>`;
}

async function checkAuthStatus() {
  try {
    const payload = await requestJson("/api/auth-status");
    authRequired = Boolean(payload.enabled);
    isAuthenticated = !authRequired || Boolean(payload.authenticated);
  } catch {
    authRequired = false;
    isAuthenticated = true;
  } finally {
    authChecked = true;
    if (isAuthenticated && !isGitHubPagesMode()) loadWorkflowDataFromServer();
    else render();
  }
}

async function loadWorkflowDataFromServer() {
  if (isGitHubPagesMode()) return;
  workflowLastLoadedAt = Date.now();
  try {
    const payload = await requestJson("/api/workflow-data");
    const collections = payload.collections || {};
    mockData.assets = applyWorkflowCollection(storageKeys.assets, collections.assets, mockData.assets);
    mockData.schedules = applyWorkflowCollection(storageKeys.schedules, collections.schedules, mockData.schedules);
    mockData.activities = applyWorkflowCollection(storageKeys.activities, collections.activities, mockData.activities);
    mockData.questions = applyWorkflowCollection(storageKeys.questions, collections.questions, mockData.questions);
    mockData.socialMetrics = applyWorkflowCollection(storageKeys.metrics, collections.socialMetrics, mockData.socialMetrics);
    savedPostAnalyses = applyWorkflowCollection(storageKeys.postAnalyses, collections.postAnalyses, savedPostAnalyses);
    normalizeAndPersistSchedules();
    normalizeAndPersistActivities();
    normalizeAnalyticsWithMovieIds();
    render();
  } catch (error) {
    console.warn("Workflow data sync failed", error);
    render();
  }
}

function applyWorkflowCollection(storageKey, serverValue, currentValue) {
  if (!Array.isArray(serverValue)) return currentValue;
  const localValue = readStorage(storageKey, []);
  if (!serverValue.length && localStorage.getItem(storageKey) && Array.isArray(localValue) && localValue.length) {
    syncWorkflowStorage(storageKey, localValue);
    return localValue;
  }
  writeLocalStorageOnly(storageKey, serverValue);
  return serverValue;
}

async function loadStyleExamplesFromServer(force = false) {
  if (styleExamplesLoading || (styleExamplesLoadedFromServer && !force)) return;
  if (isGitHubPagesMode()) {
    mockData.aiStyleExamples = readStorage(storageKeys.styleExamples, mockData.aiStyleExamples);
    styleExamplesLoadedFromServer = true;
    styleExamplesError = "目前為 GitHub Pages 展示模式，AI 風格範例會暫存在這台瀏覽器。";
    render();
    return;
  }

  styleExamplesLoading = true;
  styleExamplesError = "";
  render();
  try {
    const payload = await requestJson("/api/ai-style-examples");
    mockData.aiStyleExamples = Array.isArray(payload.examples) ? payload.examples.map(normalizeStyleExampleRecord) : [];
    writeLocalStorageOnly(storageKeys.styleExamples, mockData.aiStyleExamples);
    styleExamplesLoadedFromServer = true;
  } catch (error) {
    mockData.aiStyleExamples = readStorage(storageKeys.styleExamples, mockData.aiStyleExamples).map(normalizeStyleExampleRecord);
    styleExamplesError = `AI 風格範例庫尚未連上 Supabase。請確認 ai_style_examples 資料表與 Render 環境變數。（${error.message}）`;
  } finally {
    styleExamplesLoading = false;
    render();
  }
}

function styleExamplePayloadFromForm(formData) {
  return {
    type: String(formData.get("type") || "").trim(),
    platform: String(formData.get("platform") || "").trim(),
    movieGenre: String(formData.get("movieGenre") || "").trim(),
    campaignStage: String(formData.get("campaignStage") || "").trim(),
    tone: String(formData.get("tone") || "").trim(),
    exampleContent: String(formData.get("exampleContent") || "").trim(),
    whyItWorks: String(formData.get("whyItWorks") || "").trim(),
    usageNote: String(formData.get("usageNote") || "").trim(),
    qualityTags: parseList(formData.get("qualityTags")),
    useCase: String(formData.get("useCase") || "").trim(),
    isActive: formData.get("isActive") === "on",
    score: Math.min(5, Math.max(1, Math.round(Number(formData.get("score") || 3)))),
    aiInstruction: String(formData.get("aiInstruction") || "").trim(),
  };
}

function normalizeStyleExampleRecord(example) {
  return {
    id: example.id,
    type: example.type || "",
    platform: example.platform || "",
    movieGenre: example.movieGenre || "",
    campaignStage: example.campaignStage || "",
    tone: example.tone || "",
    exampleContent: example.exampleContent || "",
    whyItWorks: example.whyItWorks || "",
    usageNote: example.usageNote || "",
    qualityTags: Array.isArray(example.qualityTags) ? example.qualityTags : parseList(example.qualityTags),
    useCase: example.useCase || "",
    isActive: example.isActive !== false,
    score: Math.min(5, Math.max(1, Math.round(Number(example.score || 3)))),
    aiInstruction: example.aiInstruction || "",
  };
}

function upsertStyleExampleState(example) {
  const normalized = normalizeStyleExampleRecord(example);
  const index = mockData.aiStyleExamples.findIndex((item) => String(item.id) === String(normalized.id));
  if (index >= 0) mockData.aiStyleExamples[index] = normalized;
  else mockData.aiStyleExamples.unshift(normalized);
  writeLocalStorageOnly(storageKeys.styleExamples, mockData.aiStyleExamples);
  return normalized;
}

async function saveStyleExampleToServer(exampleData) {
  const editingExample = mockData.aiStyleExamples.find((example) => String(example.id) === String(editingStyleExampleId));
  if (isGitHubPagesMode()) {
    const localExample = normalizeStyleExampleRecord({ id: editingExample?.id || `style-${Date.now()}`, ...exampleData });
    if (editingExample) Object.assign(editingExample, localExample);
    else mockData.aiStyleExamples.unshift(localExample);
    writeStorage(storageKeys.styleExamples, mockData.aiStyleExamples);
    styleExamplesError = "目前為 GitHub Pages 展示模式，AI 風格範例會暫存在這台瀏覽器。";
    styleExamplesNotice = "已儲存到瀏覽器暫存。";
    return;
  }

  const url = editingExample ? `/api/ai-style-examples/${encodeURIComponent(editingExample.id)}` : "/api/ai-style-examples";
  const payload = await requestJson(url, {
    method: editingExample ? "PATCH" : "POST",
    body: JSON.stringify(exampleData),
  });
  if (payload.example) upsertStyleExampleState(payload.example);
  styleExamplesLoadedFromServer = true;
}

async function deleteStyleExampleFromServer(exampleId) {
  if (isGitHubPagesMode()) {
    mockData.aiStyleExamples = mockData.aiStyleExamples.filter((example) => String(example.id) !== String(exampleId));
    writeStorage(storageKeys.styleExamples, mockData.aiStyleExamples);
    styleExamplesError = "目前為 GitHub Pages 展示模式，AI 風格範例會暫存在這台瀏覽器。";
    return;
  }
  await requestJson(`/api/ai-style-examples/${encodeURIComponent(exampleId)}`, { method: "DELETE" });
  await loadStyleExamplesFromServer(true);
}

function isGitHubPagesMode() {
  return location.hostname.endsWith("github.io");
}

function loadMoviesFromLocalStorage() {
  mockData.movies = readStorage(storageKeys.movies, mockData.movies).map((movie) => ({
    ...normalizeMovieRecord(movie),
    releaseStatus: movieReleaseStatusOverrides[movie.id] || movie.releaseStatus || "未上映",
  }));
  moviesLoadedFromServer = true;
  moviesLoading = false;
  moviesError = movieDemoModeMessage;
  ensureSelectedMovies();
  normalizeAndPersistSchedules();
  normalizeAndPersistActivities();
  normalizeAnalyticsWithMovieIds();
}

function loadMoviesFallback(message) {
  mockData.movies = readStorage(storageKeys.movies, mockData.movies).map((movie) => ({
    ...normalizeMovieRecord(movie),
    releaseStatus: movieReleaseStatusOverrides[movie.id] || movie.releaseStatus || "未上映",
  }));
  moviesLoadedFromServer = true;
  moviesLoading = false;
  moviesError = message;
  ensureSelectedMovies();
  normalizeAndPersistSchedules();
  normalizeAndPersistActivities();
  normalizeAnalyticsWithMovieIds();
}

function friendlyCopyError(error) {
  const message = error?.message || "";
  if (message.includes("quota") || message.includes("429") || message.includes("Billing") || message.includes("額度")) {
    return "OpenAI API 額度不足或付款方案尚未啟用，請到 OpenAI 後台檢查用量與 Billing。";
  }
  if (message.includes("API Key") || message.includes("401") || message.includes("invalid_api_key")) {
    return message;
  }
  return message || "文案生成失敗，請稍後再試。";
}

async function loadMoviesFromServer(force = false) {
  if (moviesLoading || (moviesLoadedFromServer && !force)) return;
  if (isGitHubPagesMode()) {
    loadMoviesFromLocalStorage();
    render();
    return;
  }
  moviesLoading = true;
  moviesError = "";
  render();
  try {
    const payload = await requestJson("/api/movies");
    mockData.movies = (payload.movies || []).map((movie) => ({
      ...normalizeMovieRecord(movie),
      releaseStatus: movieReleaseStatusOverrides[movie.id] || movie.releaseStatus || "未上映",
    }));
    mockData.movies.forEach((movie) => {
      if (movie.coverUrl) movieCoverPreviews[movie.id] = movie.coverUrl;
    });
    writeLocalStorageOnly(storageKeys.covers, movieCoverPreviews);
    writeStorage(storageKeys.movies, mockData.movies);
    moviesLoadedFromServer = true;
    moviesLastLoadedAt = Date.now();
    ensureSelectedMovies();
    normalizeAndPersistSchedules();
    normalizeAndPersistActivities();
    normalizeAnalyticsWithMovieIds();
  } catch (error) {
    loadMoviesFallback(error?.message ? `${movieSupabaseErrorMessage}（${error.message}）` : movieSupabaseErrorMessage);
  } finally {
    moviesLoading = false;
    render();
  }
}

function ensureSelectedMovies() {
  if (!mockData.movies.some((movie) => movie.id === selectedAssetMovieId)) selectedAssetMovieId = mockData.movies[0]?.id || "";
  if (!mockData.movies.some((movie) => movie.id === selectedScheduleMovieId)) selectedScheduleMovieId = mockData.movies[0]?.id || "";
  if (!mockData.movies.some((movie) => movie.id === selectedAnalyticsMovieId)) selectedAnalyticsMovieId = mockData.movies[0]?.id || "";
  if (!mockData.movies.some((movie) => movie.id === selectedCopyMovieId)) selectedCopyMovieId = mockData.movies[0]?.id || "";
  if (selectedAssetMovieId) localStorage.setItem(storageKeys.assetMovie, selectedAssetMovieId);
  if (selectedScheduleMovieId) localStorage.setItem(storageKeys.scheduleMovie, selectedScheduleMovieId);
  if (selectedAnalyticsMovieId) localStorage.setItem(storageKeys.analyticsMovie, selectedAnalyticsMovieId);
  if (selectedCopyMovieId) localStorage.setItem(storageKeys.copyMovie, selectedCopyMovieId);
}

function getSelectedAssetMovie() {
  ensureSelectedMovies();
  return mockData.movies.find((movie) => movie.id === selectedAssetMovieId) || null;
}

function getSelectedCopyMovie() {
  ensureSelectedMovies();
  return mockData.movies.find((movie) => movie.id === selectedCopyMovieId) || null;
}

function getSelectedScheduleMovie() {
  ensureSelectedMovies();
  return mockData.movies.find((movie) => movie.id === selectedScheduleMovieId) || null;
}

function getSelectedAnalyticsMovie() {
  ensureSelectedMovies();
  return mockData.movies.find((movie) => movie.id === selectedAnalyticsMovieId) || null;
}

function movieName(movieId) {
  const movie = mockData.movies.find((item) => String(item.id) === String(movieId));
  return movie ? movieDisplayName(movie) : "未指定電影";
}

function assetName(assetId) {
  return mockData.assets.find((asset) => asset.id === assetId)?.name || "未指定素材";
}

function assetLinkUrl(assetId) {
  return mockData.assets.find((asset) => asset.id === assetId)?.linkUrl || "";
}

function scheduleAssetLink(schedule) {
  return schedule?.assetLinkUrl || assetLinkUrl(schedule?.assetId) || "";
}

function scheduleMovieId(schedule) {
  return schedule?.movieId || mockData.assets.find((asset) => asset.id === schedule?.assetId)?.movieId || "";
}

function assetsForScheduleMovie(movieId) {
  return mockData.assets.filter((asset) => !movieId || asset.movieId === movieId);
}

function questionMovieName(movieId) {
  return movieId ? movieName(movieId) : "通用題目";
}

function assetsForSelectedMovie() {
  const movie = getSelectedAssetMovie();
  return movie ? mockData.assets.filter((asset) => asset.movieId === movie.id) : [];
}

function moviePayloadFromForm(formData) {
  const editingMovie = mockData.movies.find((movie) => movie.id === editingMovieId);
  return {
    title: String(formData.get("title") || "").trim(),
    genre: String(formData.get("genre") || "").trim(),
    releaseDate: formatDateForDisplay(formData.get("releaseDate")),
    releaseStatus: String(formData.get("releaseStatus") || "未上映").trim(),
    socialTone: String(formData.get("socialTone") || "").trim(),
    coreSellingPoints: parseList(formData.get("coreSellingPoints")),
    coverUrl: editingMovie?.coverUrl || movieCoverPreviews[editingMovie?.id] || "",
  };
}

async function saveMovieToServer(movieData) {
  const editingMovie = mockData.movies.find((movie) => movie.id === editingMovieId);
  if (isGitHubPagesMode()) {
    saveMovieLocally(movieData, editingMovie);
    return;
  }
  const url = editingMovie ? `/api/movies/${encodeURIComponent(editingMovie.id)}` : "/api/movies";
  try {
    const payload = await requestJson(url, { method: editingMovie ? "PATCH" : "POST", body: JSON.stringify(movieData) });
    const movieId = editingMovie?.id || payload.movie?.id;
    if (movieId) {
      movieReleaseStatusOverrides[movieId] = movieData.releaseStatus || "未上映";
      writeStorage(storageKeys.movieReleaseStatuses, movieReleaseStatusOverrides);
    }
    await loadMoviesFromServer(true);
  } catch (error) {
    saveMovieLocally(movieData, editingMovie);
    moviesError = error?.message ? `${movieSupabaseErrorMessage}（${error.message}）` : movieSupabaseErrorMessage;
  }
}

async function deleteMovieFromServer(movieId) {
  if (isGitHubPagesMode()) {
    deleteMovieLocally(movieId);
    return;
  }
  try {
    await requestJson(`/api/movies/${encodeURIComponent(movieId)}`, { method: "DELETE" });
    delete movieCoverPreviews[movieId];
    writeStorage(storageKeys.covers, movieCoverPreviews);
    await loadMoviesFromServer(true);
  } catch (error) {
    deleteMovieLocally(movieId);
    moviesError = error?.message ? `${movieSupabaseErrorMessage}（${error.message}）` : movieSupabaseErrorMessage;
  }
}

async function saveMovieCoverToServer(movieId, coverUrl) {
  const movie = mockData.movies.find((item) => item.id === movieId);
  if (!movie) return;
  movie.coverUrl = coverUrl;
  movieCoverPreviews[movieId] = coverUrl;
  writeStorage(storageKeys.covers, movieCoverPreviews);
  if (isGitHubPagesMode()) {
    writeStorage(storageKeys.movies, mockData.movies);
    return;
  }
  try {
    await requestJson(`/api/movies/${encodeURIComponent(movieId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...movie,
        coverUrl,
      }),
    });
    await loadMoviesFromServer(true);
  } catch (error) {
    moviesError = error?.message ? `${movieSupabaseErrorMessage}（${error.message}）` : movieSupabaseErrorMessage;
  }
}

function saveMovieLocally(movieData, editingMovie) {
  const localMovie = {
    ...(editingMovie || {}),
    id: editingMovie?.id || `mov-${Date.now()}`,
    ...movieData,
    phase: editingMovie?.phase || "策略規劃",
    owner: editingMovie?.owner || "未指派",
    progress: editingMovie?.progress ?? 10,
    color: editingMovie?.color || "#234a8f",
  };
  if (editingMovie) Object.assign(editingMovie, localMovie);
  else mockData.movies.push(localMovie);
  movieReleaseStatusOverrides[localMovie.id] = movieData.releaseStatus || "未上映";
  writeStorage(storageKeys.movieReleaseStatuses, movieReleaseStatusOverrides);
  writeStorage(storageKeys.movies, mockData.movies);
  moviesLoadedFromServer = true;
  moviesError = movieDemoModeMessage;
  ensureSelectedMovies();
}

function deleteMovieLocally(movieId) {
  mockData.movies = mockData.movies.filter((movie) => movie.id !== movieId);
  delete movieReleaseStatusOverrides[movieId];
  delete movieCoverPreviews[movieId];
  writeStorage(storageKeys.movies, mockData.movies);
  writeStorage(storageKeys.movieReleaseStatuses, movieReleaseStatusOverrides);
  writeStorage(storageKeys.covers, movieCoverPreviews);
  moviesLoadedFromServer = true;
  moviesError = movieDemoModeMessage;
  ensureSelectedMovies();
}

function renderNav(activeId) {
  const nav = document.querySelector("#navList");
  nav.innerHTML = pages
    .map((page) => `<button class="nav-item ${page.id === activeId ? "active" : ""}" data-page="${page.id}"><span class="nav-icon">${page.icon}</span><span>${page.title}</span></button>`)
    .join("");
  nav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = button.dataset.page;
      render();
    });
  });
}

function movieCover(movie) {
  const url = isGitHubPagesMode() ? (movieCoverPreviews[movie.id] || movie.coverUrl) : (movie.coverUrl || movieCoverPreviews[movie.id]);
  return url ? `<img class="movie-cover-image" src="${url}" alt="${escapeHtml(movie.title)} 封面" />` : `<div class="poster large" style="--poster-color:${movie.color || "#234a8f"}"></div>`;
}

function dashboardMovieCount() {
  const activeStatuses = ["未上映", "上映中"];
  return mockData.movies.filter((movie) => activeStatuses.includes(movie.releaseStatus || movie.status)).length;
}

function dashboardPendingPostCount() {
  const pendingStatuses = ["待發布", "已排程", "草稿完成", "草稿", "已通過"];
  return mockData.schedules.filter((schedule) => pendingStatuses.includes(schedule.status)).length;
}

function dashboardPendingReviewCount() {
  const pendingReviewStatuses = ["內部審核", "片方審核", "待修改", "待確認", "修改中", "待審核"];
  return mockData.schedules.filter((schedule) => pendingReviewStatuses.includes(schedule.status)).length;
}

function isCurrentWeekDate(value) {
  const date = parseLocalDate(value);
  if (!date) return false;
  const today = startOfDay(new Date());
  const day = today.getDay() || 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - day + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return startOfDay(date) >= weekStart && startOfDay(date) <= weekEnd;
}

function isHighPerformingAnalysis(analysis) {
  const metrics = analysis?.metrics || {};
  return metrics.engagementRate >= 0.06 ||
    metrics.shareRate >= 0.01 ||
    metrics.commentRate >= 0.005 ||
    metrics.saveRate >= 0.01 ||
    metrics.followerConversionRate >= 0.01 ||
    metrics.clickRate >= 0.01 ||
    (analysis?.labels || []).includes("高價值轉換型內容");
}

function dashboardHighPerformingPostCount() {
  const analyses = [...savedPostAnalyses];
  if (postAnalysisResult && !analyses.some((analysis) => analysis.savedAt === postAnalysisResult.savedAt)) {
    analyses.unshift(postAnalysisResult);
  }
  return analyses.filter((analysis) => {
    const dateValue = analysis?.data?.postDate || analysis?.savedAt;
    return isCurrentWeekDate(dateValue) && isHighPerformingAnalysis(analysis);
  }).length;
}

function parseActivityDateTime(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function dashboardRecentActivities() {
  return [...mockData.activities]
    .filter((activity) => parseActivityDateTime(activity.dateTime))
    .sort((a, b) => parseActivityDateTime(b.dateTime) - parseActivityDateTime(a.dateTime))
    .slice(0, 5);
}

function activitiesForMovie(movieId) {
  return mockData.activities
    .filter((activity) => activity.movieId === movieId && parseActivityDateTime(activity.dateTime))
    .sort((a, b) => parseActivityDateTime(b.dateTime) - parseActivityDateTime(a.dateTime))
    .slice(0, 5);
}

function activityModal() {
  const activity = mockData.activities.find((item) => item.id === editingActivityId);
  const currentMovieId = activity?.movieId || mockData.movies[0]?.id || "";
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true">
        <div class="modal-header"><div><h2>${activity ? "編輯活動" : "新增活動"}</h2><p>管理首頁近期活動資訊。</p></div><button class="icon-button modal-close" type="button" data-action="close-activity-modal">×</button></div>
        <form id="activityForm" class="modal-form">
          <div class="field"><label>電影專案</label><select class="select" name="movieId" required style="width:100%">${mockData.movies.map((movie) => option(movie.id, currentMovieId, movie.title)).join("")}</select></div>
          <div class="field"><label>活動</label><input class="input" name="title" required value="${escapeHtml(activity?.title || "")}" /></div>
          <div class="field"><label>地點</label><input class="input" name="location" required value="${escapeHtml(activity?.location || "")}" /></div>
          <div class="field"><label>時間</label><input class="input" name="dateTime" type="datetime-local" required value="${escapeHtml(activity?.dateTime || "")}" /></div>
          <div class="field"><label>出席人員</label><input class="input" name="attendees" required value="${escapeHtml(activity?.attendees || "")}" /></div>
          <div class="field"><label>備註</label><textarea name="note">${escapeHtml(activity?.note || "")}</textarea></div>
          <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-activity-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
        </form>
      </section>
    </div>`;
}

function dashboard() {
  return `
    <div class="grid stats-grid">
      ${[
        ["進行中電影", dashboardMovieCount(), "未上映或上映中"],
        ["待發布貼文", dashboardPendingPostCount(), "待發布、已排程與草稿"],
        ["待審核內容", dashboardPendingReviewCount(), "尚待確認的內容項目"],
        ["本週高效貼文", dashboardHighPerformingPostCount(), "本週表現突出的內容"],
      ]
        .map(([label, value, note]) => `<article class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`)
        .join("")}
    </div>
    <section class="card" style="margin-top:16px">
      <div class="card-header"><div><h2>近期活動</h2><p>依電影資料同步分組，每部電影顯示最新 5 筆活動</p></div><button class="primary-button" type="button" data-action="open-activity-modal" ${mockData.movies.length ? "" : "disabled"}>新增活動</button></div>
      <div class="card-body list">
        ${mockData.movies.map((movie) => {
          const movieActivities = activitiesForMovie(movie.id);
          return `
            <article class="task-item">
              <div style="width:100%">
                <div class="card-header" style="padding:0 0 10px;border-bottom:0">
                  <div><strong>${escapeHtml(movie.title)}</strong><span class="muted">${escapeHtml(movie.genre || "電影專案")}｜${escapeHtml(movie.releaseStatus || "未上映")}</span></div>
                  <span class="status blue">${movieActivities.length} 筆活動</span>
                </div>
                <div class="list">
                  ${movieActivities.map((item) => `
                    <div class="task-item">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <span class="muted">${escapeHtml(item.location)}｜${escapeHtml(formatActivityDateTime(item.dateTime))}｜${escapeHtml(item.attendees)}</span>
                        ${item.note ? `<span class="muted">備註：${escapeHtml(item.note)}</span>` : ""}
                      </div>
                      <div class="meta-row">
                        <button class="secondary-button" type="button" data-action="edit-activity" data-activity-id="${item.id}">編輯</button>
                        <button class="secondary-button" type="button" data-action="delete-activity" data-activity-id="${item.id}">刪除</button>
                      </div>
                    </div>`).join("") || `<div class="task-item"><span class="muted">目前尚無活動排程</span></div>`}
                </div>
              </div>
            </article>`;
        }).join("") || `<div class="task-item"><span class="muted">請先新增電影，再建立近期活動。</span></div>`}
      </div>
    </section>
    ${isActivityModalOpen ? activityModal() : ""}
  `;
}

function moviesPage() {
  return `
    ${moviesError ? `<div class="task-item" style="margin-bottom:16px"><strong>電影資料展示模式</strong><span class="muted">${escapeHtml(moviesError)}</span></div>` : ""}
    ${moviesLoading ? `<div class="task-item" style="margin-bottom:16px"><strong>讀取電影資料中...</strong><span class="muted">正在從 Supabase 載入 movies 資料表</span></div>` : ""}
    <div class="toolbar">
      <button class="primary-button" type="button" data-action="open-movie-modal">新增電影</button>
    </div>
    <div class="movie-grid">
      ${mockData.movies.map((movie) => `
        <article class="card movie-card">
          <div class="movie-cover-wrap">${movieCover(movie)}</div>
          <div class="card-body">
            <h3>${escapeHtml(movie.title)}</h3>
            <span class="muted">${escapeHtml(movie.genre)}｜上映 ${escapeHtml(movie.releaseDate)}</span>
            <div class="meta-row">${status(movie.releaseStatus || "未上映")}${status(movie.phase || "企劃中")}<span class="tag">負責 ${escapeHtml(movie.owner || "未指定")}</span></div>
            <p class="muted">語氣：${escapeHtml(movie.socialTone)}</p>
            <div class="meta-row">${(movie.coreSellingPoints || []).map((point) => `<span class="tag">${escapeHtml(point)}</span>`).join("")}</div>
            <div class="progress" style="margin-top:14px"><span style="--value:${movie.progress || 10}%"></span></div>
            <div class="meta-row">
              <button class="secondary-button" type="button" data-action="add-movie-cover" data-movie-id="${movie.id}">新增電影封面</button>
              <button class="secondary-button" type="button" data-action="edit-movie" data-movie-id="${movie.id}">編輯</button>
              <button class="secondary-button" type="button" data-action="delete-movie" data-movie-id="${movie.id}">刪除</button>
            </div>
          </div>
        </article>`).join("") || `<article class="card"><div class="card-body"><h3>尚無電影資料</h3><p class="muted">請先新增電影。</p></div></article>`}
    </div>
    ${isMovieModalOpen ? movieModal() : ""}
  `;
}

function movieModal() {
  const movie = mockData.movies.find((item) => item.id === editingMovieId);
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true">
        <div class="modal-header"><div><h2>${movie ? "編輯電影" : "新增電影"}</h2><p>建立電影基本資料與社群溝通設定。</p></div><button class="icon-button modal-close" type="button" data-action="close-movie-modal">×</button></div>
        <form id="movieForm" class="modal-form">
          <div class="field"><label for="movieTitle">片名</label><input class="input" id="movieTitle" name="title" required value="${escapeHtml(movie?.title || "")}" /></div>
          <div class="field"><label for="movieGenre">類型</label><input class="input" id="movieGenre" name="genre" required value="${escapeHtml(movie?.genre || "")}" /></div>
          <div class="field"><label for="movieReleaseDate">上映日期</label><input class="input" id="movieReleaseDate" name="releaseDate" type="date" required value="${escapeHtml(formatDateForInput(movie?.releaseDate))}" /></div>
          <div class="field"><label for="movieReleaseStatus">上映狀態</label><select class="select" id="movieReleaseStatus" name="releaseStatus" required style="width:100%">${["未上映", "上映中", "下檔"].map((item) => option(item, movie?.releaseStatus || "未上映")).join("")}</select></div>
          <div class="field"><label for="movieSocialTone">社群語氣</label><textarea id="movieSocialTone" name="socialTone" required>${escapeHtml(movie?.socialTone || "")}</textarea></div>
          <div class="field"><label for="movieSellingPoints">核心賣點</label><textarea id="movieSellingPoints" name="coreSellingPoints" required placeholder="請用逗號分隔">${escapeHtml((movie?.coreSellingPoints || []).join(", "))}</textarea></div>
          <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-movie-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
        </form>
      </section>
    </div>`;
}

function assetsPage() {
  const selectedMovie = getSelectedAssetMovie();
  const visibleAssets = assetsForSelectedMovie();
  return `
    <div class="toolbar">
      <select class="select" id="assetMovieSelect" ${mockData.movies.length ? "" : "disabled"}>${mockData.movies.map((movie) => option(movie.id, selectedMovie?.id, movie.title)).join("") || "<option>尚無電影資料</option>"}</select>
      <input class="input" readonly value="${selectedMovie ? `${selectedMovie.title} 的素材庫` : "請先新增電影"}" />
      <button class="primary-button" type="button" data-action="open-asset-modal" ${selectedMovie ? "" : "disabled"}>新增素材</button>
    </div>
    <div class="task-item" style="margin-bottom:16px"><strong>${escapeHtml(selectedMovie?.title || "尚無電影")}</strong><span class="muted">目前共 ${visibleAssets.length} 筆素材</span></div>
    <div class="asset-grid">
      ${visibleAssets.map((asset) => `
        <article class="card asset-card">
          <div class="asset-preview" style="--asset-color:${asset.color || "#234a8f"}">${escapeHtml(asset.assetType)}</div>
          <div class="card-body">
            <h3>${escapeHtml(asset.name)}</h3>
            <span class="muted">${escapeHtml(movieName(asset.movieId))}</span>
            <div class="meta-row">${status(asset.reviewStatus)}<span class="tag">劇透 ${escapeHtml(asset.spoilerLevel)}</span></div>
            <div class="meta-row">${(asset.suitablePlatforms || []).map((platform) => `<span class="tag">${escapeHtml(platform)}</span>`).join("")}</div>
            <div class="meta-row">
              <button class="secondary-button" type="button" data-action="open-asset-link" data-asset-id="${asset.id}">連結</button>
              <button class="secondary-button" type="button" data-action="edit-asset" data-asset-id="${asset.id}">編輯</button>
              <button class="secondary-button" type="button" data-action="delete-asset" data-asset-id="${asset.id}">刪除</button>
            </div>
          </div>
        </article>`).join("") || `<article class="card"><div class="card-body"><h3>這部電影目前沒有素材</h3><p class="muted">請新增專屬素材。</p></div></article>`}
    </div>
    ${isAssetModalOpen ? assetModal() : ""}
  `;
}

function assetModal() {
  const asset = mockData.assets.find((item) => item.id === editingAssetId);
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true">
        <div class="modal-header"><div><h2>${asset ? "編輯素材" : "新增素材"}</h2><p>素材會儲存在目前選取電影的素材庫。</p></div><button class="icon-button modal-close" type="button" data-action="close-asset-modal">×</button></div>
        <form id="assetForm" class="modal-form">
          <div class="field"><label>素材名稱</label><input class="input" name="name" required value="${escapeHtml(asset?.name || "")}" /></div>
          <div class="field"><label>素材類型</label><select class="select" name="assetType" required style="width:100%">${["海報", "影片", "劇照", "短影音", "限動"].map((item) => option(item, asset?.assetType || "")).join("")}</select></div>
          <div class="field"><label>適合平台</label><textarea name="suitablePlatforms" required>${escapeHtml((asset?.suitablePlatforms || []).join(", "))}</textarea></div>
          <div class="field"><label>劇透等級</label><select class="select" name="spoilerLevel" required style="width:100%">${["無", "低", "中", "高"].map((item) => option(item, asset?.spoilerLevel || "低")).join("")}</select></div>
          <div class="field"><label>審核狀態</label><select class="select" name="reviewStatus" required style="width:100%">${["待審核", "內部審核", "片方審核", "已通過", "修改中"].map((item) => option(item, asset?.reviewStatus || "待審核")).join("")}</select></div>
          <div class="field"><label>外部連結</label><div class="link-input-row"><input class="input" id="assetLinkUrl" name="linkUrl" type="url" value="${escapeHtml(asset?.linkUrl || "")}" placeholder="https://drive.google.com/..." /><button class="secondary-button" type="button" data-action="enable-asset-link">新增連結</button></div></div>
          <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-asset-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
        </form>
      </section>
    </div>`;
}

function schedulePage() {
  const start = getScheduleWeekStart();
  const end = addDays(start, 6);
  const selectedMovie = getSelectedScheduleMovie();
  const visibleSchedules = schedulesForCurrentWeek();
  return `
    <div class="toolbar">
      <select class="select" id="scheduleMovieSelect" ${mockData.movies.length ? "" : "disabled"}>${mockData.movies.map((movie) => option(movie.id, selectedMovie?.id, movie.title)).join("") || "<option>尚無電影資料</option>"}</select>
      <input class="input" readonly value="${selectedMovie ? `${selectedMovie.title} 的社群排程` : "請先新增電影"}" />
      <button class="secondary-button" type="button" data-action="schedule-week-prev">上一週</button>
      <button class="primary-button" type="button" data-action="open-schedule-modal" ${selectedMovie ? "" : "disabled"}>新增排程</button>
      <button class="secondary-button" type="button" data-action="schedule-week-next">下一週</button>
    </div>
    <div class="task-item" style="margin-bottom:16px"><strong>${escapeHtml(selectedMovie?.title || "尚無電影")}</strong><span class="muted">${formatWeekDate(start)} - ${formatWeekDate(end)}，共 ${visibleSchedules.length} 筆排程</span></div>
    <section class="card">
      <div class="card-header"><div><h2>社群排程清單</h2><p>依目前選取電影與發文日期顯示週次排程。</p></div></div>
      <div class="card-body table-wrap">
        <table>
          <thead><tr><th>日期</th><th>電影</th><th>平台</th><th>主題</th><th>文案</th><th>素材</th><th>負責人</th><th>狀態</th><th>操作</th></tr></thead>
          <tbody>${visibleSchedules.map((item) => `
            <tr>
              <td>${escapeHtml(item.date)}</td><td>${escapeHtml(movieName(scheduleMovieId(item)))}</td><td>${escapeHtml(item.platform)}</td><td><strong>${escapeHtml(item.topic)}</strong></td><td>${escapeHtml(item.copy)}</td><td><div class="meta-row"><span>${escapeHtml(assetName(item.assetId))}</span>${scheduleAssetLink(item) ? `<button class="secondary-button" type="button" data-action="open-schedule-asset-link" data-schedule-id="${item.id}">連結</button>` : ""}</div></td><td>${escapeHtml(item.owner)}</td>
              <td><select class="select schedule-status-select" data-schedule-id="${item.id}">${scheduleStatuses.map((state) => option(state, item.status)).join("")}</select></td>
              <td><div class="meta-row"><button class="secondary-button" type="button" data-action="edit-schedule" data-schedule-id="${item.id}">編輯</button><button class="secondary-button" type="button" data-action="delete-schedule" data-schedule-id="${item.id}">刪除</button></div></td>
            </tr>`).join("") || `<tr><td colspan="9"><span class="muted">${selectedMovie ? "這部電影這一週目前沒有社群排程。" : "請先新增電影，再建立社群排程。"}</span></td></tr>`}</tbody>
        </table>
      </div>
    </section>
    ${isScheduleModalOpen ? scheduleModal() : ""}`;
}

function scheduleModal() {
  const schedule = mockData.schedules.find((item) => item.id === editingScheduleId);
  const selectedMovie = getSelectedScheduleMovie();
  const selectedMovieId = scheduleMovieId(schedule) || selectedMovie?.id || "";
  const scheduleAssets = assetsForScheduleMovie(selectedMovieId);
  return `
    <div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true">
      <div class="modal-header"><div><h2>${schedule ? "編輯排程" : "新增排程"}</h2><p>設定單部電影的社群發文時間與內容。</p></div><button class="icon-button modal-close" type="button" data-action="close-schedule-modal">×</button></div>
      <form id="scheduleForm" class="modal-form">
        <div class="field"><label>電影專案</label><select class="select" id="scheduleMovieId" name="movieId" required style="width:100%">${mockData.movies.map((movie) => option(movie.id, selectedMovieId, movie.title)).join("")}</select></div>
        <div class="field"><label>發布日期</label><input class="input" name="date" type="date" required value="${escapeHtml(formatDateForInput(schedule?.date || formatWeekDate(getScheduleWeekStart())))}" /></div>
        <div class="field"><label>平台</label><select class="select" name="platform" style="width:100%">${["Facebook", "Instagram", "Instagram Reels", "Threads", "YouTube Shorts", "TikTok", "LINE VOOM"].map((item) => option(item, schedule?.platform || "Facebook")).join("")}</select></div>
        <div class="field"><label>內容主題</label><input class="input" name="topic" required value="${escapeHtml(schedule?.topic || "")}" /></div>
        <div class="field"><label>文案</label><textarea name="copy" required>${escapeHtml(schedule?.copy || "")}</textarea></div>
        <div class="field"><label>使用素材</label><select class="select" id="scheduleAssetId" name="assetId" style="width:100%"><option value="">未指定素材</option>${scheduleAssets.map((asset) => option(asset.id, schedule?.assetId || "", asset.name)).join("")}</select></div>
        <div class="field"><label>素材連結</label><div class="link-input-row"><input class="input" id="scheduleAssetLinkUrl" name="assetLinkUrl" type="url" value="${escapeHtml(scheduleAssetLink(schedule))}" placeholder="https://drive.google.com/... 或圖片 / 影片連結" /><button class="secondary-button" type="button" data-action="enable-schedule-link">新增連結</button></div><small class="muted">可貼上 Google Drive、雲端圖片或影片連結；若素材庫已有連結，選取素材時會自動帶入。</small></div>
        <div class="field"><label>狀態</label><select class="select" name="status" style="width:100%">${scheduleStatuses.map((item) => option(item, schedule?.status || "草稿")).join("")}</select></div>
        <div class="field"><label>負責人</label><input class="input" name="owner" required value="${escapeHtml(schedule?.owner || "")}" /></div>
        <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-schedule-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
      </form>
    </section></div>`;
}

function cleanGeneratedCopyText(value) {
  return String(value || "")
    .replace(/"\],\s*"(igPosts|threadsPosts|storyQuestions|replySuggestions)"[\s\S]*$/u, "")
    .replace(/\}\s*Reviewing the content:[\s\S]*$/u, "")
    .replace(/\s*# Done\.[\s\S]*$/u, "")
    .replace(/\s*\(END\)[\s\S]*$/u, "")
    .trim();
}

function renderCopySection(title, values) {
  const cleanValues = Array.isArray(values) ? values.map(cleanGeneratedCopyText).filter(Boolean).slice(0, 5) : [];
  return `<div class="copy-card"><strong>${escapeHtml(title)}</strong>${cleanValues.map((item) => `<p>${escapeHtml(item)}</p>`).join("") || `<p class="muted">尚未產生內容</p>`}</div>`;
}

function buildMockCopyResult(movie, focus) {
  const title = movie?.title || "這部電影";
  const tone = movie?.socialTone || "有質感";
  const sellingPoint = (movie?.coreSellingPoints || [])[0] || "故事張力";
  const cleanFocus = focus || "正式宣傳上線，提醒觀眾關注上映資訊。";
  return {
    facebookPosts: [
      `【${title}】即將帶來全新的觀影體驗。這次我們想用${tone}的方式，和你一起靠近${sellingPoint}。${cleanFocus}`,
      `${title} 的故事已經準備好和大家見面。從角色、情緒到每一個轉折，都值得在大銀幕慢慢感受。`,
      `如果你喜歡有記憶點的電影，這次請把 ${title} 放進片單。上映資訊與更多幕後內容會陸續公開。`,
      `一部電影最迷人的地方，往往藏在細節裡。${title} 想和你一起看見那些不能錯過的瞬間。`,
      `本週宣傳重點：${cleanFocus}。歡迎分享給也在等這部片的朋友。`,
    ],
    igPosts: [
      `${title}｜${sellingPoint}\n用${tone}的節奏，慢慢靠近故事核心。\n#電影推薦 #${title}`,
      `有些故事，看完會留在心裡。\n${title} 即將上映，先把日期留起來。`,
      `正式宣傳啟動。\n${cleanFocus}\n你最期待哪一個橋段？`,
      `一張海報、一句台詞、一個眼神。\n${title} 的情緒正在靠近。`,
      `給正在找下一部電影的你：${title} 值得放進清單。`,
    ],
    threadsPosts: [
      `如果只能用一句話形容 ${title}，你會怎麼說？`,
      `${title} 的宣傳重點是「${cleanFocus}」，我覺得最適合先丟給觀眾討論的是角色動機。`,
      `有些電影不是看完就結束，而是會讓你想和朋友聊很久。${title} 可能就是這種。`,
      `你看電影最在意什麼？劇情、演員、節奏，還是看完後留下來的感覺？`,
      `${title} 上映前，我們想先問：你最期待看到哪一種情緒？`,
    ],
    storyQuestions: [
      `看完 ${title} 的預告，你第一個感覺是什麼？`,
      `如果只能選一個關鍵字形容 ${title}，你會選哪個？`,
      `你會約誰一起看 ${title}？`,
      `你最期待 ${title} 的哪個元素：角色、劇情、畫面、音樂？`,
      `上映後你想先看口碑再進場，還是第一時間衝？`,
    ],
    replySuggestions: [
      `謝謝你的分享，這個角度很適合延伸成下一篇互動題。`,
      `你提到的重點很棒，我們後續也會釋出更多相關內容。`,
      `這個期待值收到，正式上映時一定要一起來聊。`,
      `你的留言很有畫面感，感覺會是很好的觀影切入點。`,
      `感謝支持，更多 ${title} 的宣傳內容會陸續更新。`,
    ],
  };
}

function fallbackQuestionAiResult(question, mode) {
  if (mode === "rewrite") {
    return {
      title: "AI 改寫結果",
      note: "展示結果，可複製後新增到題庫。",
      items: [
        { title: "IG 限動版", text: `${question.content} 用投票貼紙選出你的答案！` },
        { title: "Threads 版", text: `${question.content} 想聽大家的直覺答案。` },
        { title: "Facebook 版", text: `${question.content} 歡迎留言分享你的看法。` },
        { title: "Reels 字卡版", text: `${question.content} 3 秒內回答，留言見。` },
      ],
    };
  }
  return {
    title: "AI 相似題",
    note: "展示結果，可複製後新增到題庫。",
    items: Array.from({ length: 5 }, (_, index) => ({
      title: `相似題 ${index + 1}`,
      text: `${question.content.replace("你", "大家")} 如果換一種角度，你會怎麼回答？`,
    })),
  };
}

function questionBatchMovie() {
  if (questionFilters.movieId !== "全部") {
    return mockData.movies.find((movie) => movie.id === questionFilters.movieId) || null;
  }
  return getSelectedCopyMovie() || mockData.movies[0] || null;
}

function fallbackQuestionBatch(movie) {
  const title = movie?.title || "電影專案";
  const tones = ["親切", "神祕", "感性", "幽默", "懸疑"];
  const platforms = ["IG 限動", "Threads", "Facebook", "Reels"];
  const types = ["開放問答", "投票", "二選一", "留言引導", "測驗"];
  const phases = ["前導期", "預告上線", "上映倒數", "上映中", "口碑擴散"];
  return Array.from({ length: 10 }, (_, index) => ({
    content: `看完《${title}》這個線索後，你最想知道哪個角色的下一步？`,
    type: types[index % types.length],
    platform: platforms[index % platforms.length],
    tone: tones[index % tones.length],
    phase: phases[index % phases.length],
    cta: "回覆、留言或投票告訴我們",
    asset: index % 2 ? "角色劇照" : "主視覺海報",
    note: "展示模式產生，可再依檔期調整。",
  }));
}

function appendQuestionBatch(questions, movie) {
  const now = Date.now();
  const createdAt = formatWeekDate(new Date());
  const nextQuestions = questions.map((question, index) => ({
    id: `q-ai-${now}-${index}`,
    content: question.content || "未命名題目",
    movieId: movie?.id || "",
    type: question.type || "開放問答",
    platform: question.platform || "IG 限動",
    tone: question.tone || "親切",
    phase: question.phase || "預告上線",
    status: "可使用",
    cta: question.cta || "回覆或留言告訴我們",
    asset: question.asset || "主視覺海報",
    uses: 0,
    lastUsed: "",
    performance: "未測試",
    note: question.note || "AI 生成題目，可再編輯調整。",
    createdAt,
  }));
  mockData.questions = [...mockData.questions, ...nextQuestions];
  writeStorage(storageKeys.questions, mockData.questions);
  return nextQuestions;
}

async function generateQuestionBatch() {
  if (isQuestionAiGenerating) return;
  const movie = questionBatchMovie();
  isQuestionAiGenerating = true;
  questionAiResult = {
    title: "AI 生成題目中",
    note: "請稍候，正在產生新一批互動題。完成後會追加到原本題庫下方。",
    items: [{ title: "生成中", text: "OpenAI 正在依電影資料產生 10 題新的互動問答題。" }],
  };
  render();
  try {
    let generatedQuestions;
    if (isGitHubPagesMode()) {
      generatedQuestions = fallbackQuestionBatch(movie);
    } else {
      const payload = await requestJson("/api/generate-question-batch", {
        method: "POST",
        body: JSON.stringify({
          movie: {
            title: movie?.title || "電影專案",
            genre: movie?.genre || "",
            releaseDate: movie?.releaseDate || "",
            socialTone: movie?.socialTone || "",
            coreSellingPoints: movie?.coreSellingPoints || [],
          },
          existingCount: mockData.questions.length,
          batchSeed: Date.now(),
        }),
      });
      generatedQuestions = payload.questions || [];
    }
    const addedQuestions = appendQuestionBatch(generatedQuestions, movie);
    questionAiResult = {
      title: "AI 生成題目完成",
      note: `已新增 ${addedQuestions.length} 筆題目到題庫下方。按鈕可以再次點擊，繼續生成新一批。`,
      items: addedQuestions.slice(0, 10).map((question, index) => ({
        title: `新題目 ${index + 1}`,
        text: question.content,
      })),
    };
  } catch (error) {
    questionAiResult = {
      title: "AI 生成題目失敗",
      note: `${friendlyCopyError(error)} 請確認 OpenAI 設定後可再次點擊重試。`,
      items: [{ title: "尚未新增題目", text: "這次生成失敗，原本題庫沒有被覆蓋或刪除。" }],
    };
  } finally {
    isQuestionAiGenerating = false;
    render();
  }
}

async function generateQuestionAiResult(question, mode) {
  isQuestionAiGenerating = true;
  questionAiResult = {
    title: mode === "rewrite" ? "AI 改寫中" : "AI 產生相似題中",
    note: "請稍候，正在產生內容。",
    items: [{ title: "處理中", text: "OpenAI 正在依題目內容產生結果。" }],
  };
  render();
  try {
    if (isGitHubPagesMode()) {
      questionAiResult = fallbackQuestionAiResult(question, mode);
    } else {
      const movie = mockData.movies.find((item) => item.id === question.movieId);
      const payload = await requestJson("/api/generate-question-tool", {
        method: "POST",
        body: JSON.stringify({
          mode,
          question: {
            ...question,
            movieTitle: movie ? movieDisplayName(movie) : question.movieTitle,
            movieGenre: movie?.genre || question.movieGenre || "",
          },
        }),
      });
      questionAiResult = {
        title: mode === "rewrite" ? "AI 改寫結果" : "AI 相似題",
        note: "OpenAI 產生結果，可複製後新增到題庫。",
        items: payload.items || [],
      };
    }
  } catch (error) {
    questionAiResult = fallbackQuestionAiResult(question, mode);
    questionAiResult.note = `${friendlyCopyError(error)} 目前先顯示展示結果。`;
  } finally {
    isQuestionAiGenerating = false;
    render();
  }
}

function copyPage() {
  const selectedMovie = getSelectedCopyMovie();
  const generatedHtml = generatedCopyResult
    ? [
        renderCopySection("FACEBOOK", generatedCopyResult.facebookPosts),
        renderCopySection("IG", generatedCopyResult.igPosts),
        renderCopySection("Threads", generatedCopyResult.threadsPosts),
        renderCopySection("限時互動題", generatedCopyResult.storyQuestions),
        renderCopySection("留言回覆建議", generatedCopyResult.replySuggestions),
      ].join("")
    : "";
  return `
    <div class="generator-layout">
      <section class="card">
        <div class="card-header"><div><h2>文案設定</h2><p>選擇電影並填入溝通重點，一次產生三個平台的社群文案。</p></div></div>
        <div class="card-body form-stack">
          ${moviesError ? `<p class="status red">${escapeHtml(moviesError)}</p>` : ""}
          ${moviesLoading ? `<p class="muted">正在同步電影資料...</p>` : ""}
          <div class="field"><label>電影</label><select class="select" id="copyMovie" style="width:100%" ${mockData.movies.length ? "" : "disabled"}>${mockData.movies.map((movie) => option(movie.id, selectedMovie?.id, movie.title)).join("") || "<option>尚無電影資料</option>"}</select></div>
          ${selectedMovie ? `<div class="task-item"><strong>${escapeHtml(selectedMovie.title)}</strong><span class="muted">${escapeHtml(selectedMovie.genre)}｜上映 ${escapeHtml(selectedMovie.releaseDate)}｜${escapeHtml(selectedMovie.socialTone)}</span></div>` : ""}
          <div class="field"><label>溝通重點</label><textarea id="copyFocus" placeholder="例如：正式預告上線、提醒上映日期、主打懸疑氛圍，語氣要精準但保留神祕感。">${escapeHtml(copyFocusValue)}</textarea></div>
          <button class="primary-button" type="button" data-action="generate-copy-preview" ${isCopyGenerating || !selectedMovie ? "disabled" : ""}>${isCopyGenerating ? "生成中..." : "生成文案"}</button>
          ${copyGeneratorError ? `<p class="status red">${escapeHtml(copyGeneratorError)}</p>` : ""}
        </div>
      </section>
      <section class="card">
        <div class="card-header"><div><h2>文案預覽</h2><p>一次顯示 Facebook、IG、Threads 可使用的文章。</p></div></div>
        <div class="card-body list">${generatedHtml || `<div class="copy-card"><strong>尚未產生文案</strong><p class="muted">請填寫溝通重點後點擊「生成文案」。</p></div>`}</div>
      </section>
    </div>`;
}

async function generateCopyPreview() {
  const movie = mockData.movies.find((item) => item.id === (document.querySelector("#copyMovie")?.value || selectedCopyMovieId)) || getSelectedCopyMovie();
  if (!movie) {
    copyGeneratorError = "請先在電影資料頁新增電影，再產生文案。";
    render();
    return;
  }
  copyFocusValue = document.querySelector("#copyFocus")?.value.trim() || "";
  localStorage.setItem(storageKeys.copyFocus, copyFocusValue);
  isCopyGenerating = true;
  copyGeneratorError = "";
  generatedCopyResult = null;
  render();
  try {
    if (isGitHubPagesMode()) {
      generatedCopyResult = buildMockCopyResult(movie, copyFocusValue);
    } else {
      const payload = await requestJson("/api/generate-copy", {
        method: "POST",
        body: JSON.stringify({
          movie: {
            title: movie.title,
            genre: movie.genre,
            releaseDate: movie.releaseDate,
            socialTone: movie.socialTone,
            coreSellingPoints: movie.coreSellingPoints || [],
          },
          platforms: ["Facebook", "Instagram", "Threads"],
          focus: copyFocusValue,
        }),
      });
      generatedCopyResult = payload;
    }
  } catch (error) {
    if (isGitHubPagesMode()) {
      generatedCopyResult = buildMockCopyResult(movie, copyFocusValue);
      copyGeneratorError = "目前為 GitHub Pages 展示模式，已先產生展示文案。正式 OpenAI API 請部署到 Render 後使用。";
    } else {
      copyGeneratorError = friendlyCopyError(error);
    }
  } finally {
    isCopyGenerating = false;
    render();
  }
}

const styleFilterOptions = {
  type: ["全部", "貼文", "留言回覆", "CTA", "負評回覆", "數據分析"],
  platform: ["全部", "IG", "FB", "Threads", "YouTube", "通用"],
  movieGenre: ["全部", "恐怖", "愛情", "喜劇", "劇情", "動作", "懸疑", "通用"],
  campaignStage: ["全部", "上映前", "上映中", "下檔前", "口碑期", "通用"],
};

function normalizeStyleValue(value) {
  const text = String(value || "").trim();
  const aliases = {
    Instagram: "IG",
    Facebook: "FB",
    "IG 限動": "IG",
    Reels: "IG",
    驚悚: "恐怖",
    前導期: "上映前",
    預告上線: "上映前",
    上映倒數: "上映前",
    口碑擴散: "口碑期",
  };
  return aliases[text] || text;
}

function styleExampleMatchesFilters(example) {
  const keyword = styleExampleFilters.search.trim().toLowerCase();
  const keywordMatch = !keyword || [
    example.exampleContent,
    example.tone,
    example.whyItWorks,
    example.usageNote,
    example.useCase,
    example.aiInstruction,
    ...(example.qualityTags || []),
  ].some((value) => String(value || "").toLowerCase().includes(keyword));
  return keywordMatch &&
    (styleExampleFilters.type === "全部" || normalizeStyleValue(example.type) === styleExampleFilters.type) &&
    (styleExampleFilters.platform === "全部" || normalizeStyleValue(example.platform) === styleExampleFilters.platform) &&
    (styleExampleFilters.movieGenre === "全部" || normalizeStyleValue(example.movieGenre) === styleExampleFilters.movieGenre) &&
    (styleExampleFilters.campaignStage === "全部" || normalizeStyleValue(example.campaignStage) === styleExampleFilters.campaignStage);
}

function styleFilterSelect(name, label) {
  return `<label class="filter-field"><span>${label}</span><select class="select style-filter" data-filter="${name}">${styleFilterOptions[name].map((item) => option(item, styleExampleFilters[name])).join("")}</select></label>`;
}

function styleExampleStats() {
  return [
    ["總範例數", mockData.aiStyleExamples.length, "目前累積範例"],
    ["啟用範例數", mockData.aiStyleExamples.filter((item) => item.isActive !== false).length, "OpenAI 會優先參考"],
    ["貼文範例數", mockData.aiStyleExamples.filter((item) => normalizeStyleValue(item.type) === "貼文").length, "貼文生成可用"],
    ["負評回覆範例數", mockData.aiStyleExamples.filter((item) => normalizeStyleValue(item.type) === "負評回覆").length, "危機回覆可用"],
    ["數據分析範例數", mockData.aiStyleExamples.filter((item) => normalizeStyleValue(item.type) === "數據分析").length, "分析報告可用"],
  ];
}

function styleExampleScore(example) {
  const score = Number(example?.score);
  if (!Number.isFinite(score)) return 3;
  return Math.min(5, Math.max(1, Math.round(score)));
}

function styleExampleCard(example) {
  const tags = Array.isArray(example.qualityTags) ? example.qualityTags : parseList(example.qualityTags);
  const active = example.isActive !== false;
  const score = styleExampleScore(example);
  return `
    <article class="card style-example-card">
      <div class="card-body">
        <div class="style-example-top">
          <div>
            <div class="meta-row">
              <span class="tag">${escapeHtml(example.type)}</span>
              <span class="tag">${escapeHtml(example.platform)}</span>
              <span class="tag">${escapeHtml(example.movieGenre)}</span>
              <span class="tag">${escapeHtml(example.campaignStage)}</span>
              ${status(active ? "啟用" : "停用")}
              ${status(example.tone || "參考")}
            </div>
            <h3>${escapeHtml(example.type || "未分類")}｜${escapeHtml(example.platform || "未指定平台")}</h3>
            <span class="muted">${escapeHtml(example.useCase || "尚未設定適用任務")}｜推薦 ${"★".repeat(score)}${"☆".repeat(5 - score)}</span>
          </div>
          <div class="meta-row">
            <button class="secondary-button" type="button" data-action="copy-style-example" data-style-id="${example.id}">複製內容</button>
            <button class="secondary-button" type="button" data-action="use-style-example" data-style-id="${example.id}">用這則生成</button>
            <button class="secondary-button" type="button" data-action="edit-style-example" data-style-id="${example.id}">編輯</button>
            <button class="secondary-button" type="button" data-action="delete-style-example" data-style-id="${example.id}">刪除</button>
          </div>
        </div>
        <div class="style-example-content">${escapeHtml(example.exampleContent || "尚未填寫範例內容")}</div>
        <div class="meta-row">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || `<span class="muted">尚未設定品質標籤</span>`}</div>
        <div class="question-detail-grid">
          <div><span class="muted">為什麼這則好</span><strong>${escapeHtml(example.whyItWorks || "尚未填寫")}</strong></div>
          <div><span class="muted">使用建議</span><strong>${escapeHtml(example.usageNote || "尚未填寫")}</strong></div>
          <div><span class="muted">給 AI 的使用提示</span><strong>${escapeHtml(example.aiInstruction || "尚未填寫")}</strong></div>
          <div><span class="muted">適用任務</span><strong>${escapeHtml(example.useCase || "尚未設定")}</strong></div>
        </div>
      </div>
    </article>`;
}

function styleExampleModal() {
  const example = mockData.aiStyleExamples.find((item) => String(item.id) === String(editingStyleExampleId));
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true">
        <div class="modal-header"><div><h2>${example ? "編輯風格範例" : "新增風格範例"}</h2><p>這些範例會提供給 OpenAI 產生文案、互動題與分析報告時參考。</p></div><button class="icon-button modal-close" type="button" data-action="close-style-example-modal">×</button></div>
        <form id="styleExampleForm" class="modal-form">
          <div class="field"><label>類型 type</label><select class="select" name="type" required style="width:100%">${["貼文", "留言回覆", "CTA", "負評回覆", "數據分析", "互動題", "互動題改寫"].map((item) => option(item, example?.type || "貼文")).join("")}</select></div>
          <div class="field"><label>平台 platform</label><select class="select" name="platform" required style="width:100%">${["IG", "FB", "Threads", "YouTube", "通用"].map((item) => option(item, normalizeStyleValue(example?.platform) || "IG")).join("")}</select></div>
          <div class="field"><label>電影類型 movie_genre</label><select class="select" name="movieGenre" required style="width:100%">${["恐怖", "愛情", "喜劇", "劇情", "動作", "懸疑", "通用"].map((item) => option(item, normalizeStyleValue(example?.movieGenre) || "通用")).join("")}</select></div>
          <div class="field"><label>宣傳情境 campaign_stage</label><select class="select" name="campaignStage" required style="width:100%">${["上映前", "上映中", "下檔前", "口碑期", "通用"].map((item) => option(item, normalizeStyleValue(example?.campaignStage) || "上映中")).join("")}</select></div>
          <div class="field"><label>語氣 tone</label><input class="input" name="tone" required value="${escapeHtml(example?.tone || "")}" placeholder="例如：神祕、熱血、感性、幽默、專業白話" /></div>
          <div class="field"><label>品質標籤 quality_tags</label><textarea name="qualityTags" placeholder="例如：有記憶點、適合互動、適合轉粉">${escapeHtml((example?.qualityTags || []).join ? example.qualityTags.join(", ") : example?.qualityTags || "")}</textarea></div>
          <div class="field"><label>適用任務 use_case</label><input class="input" name="useCase" value="${escapeHtml(example?.useCase || "")}" placeholder="例如：產生 IG 貼文、產生負評回覆" /></div>
          <div class="field"><label>推薦程度 score</label><select class="select" name="score" style="width:100%">${[1, 2, 3, 4, 5].map((item) => option(String(item), String(styleExampleScore(example)), `${item} 分`)).join("")}</select></div>
          <div class="field"><label>是否啟用 is_active</label><label class="toggle-row"><input type="checkbox" name="isActive" ${example?.isActive === false ? "" : "checked"} /> 啟用，讓 OpenAI 可以參考這則範例</label></div>
          <div class="field"><label>範例內容 example_content</label><textarea name="exampleContent" required>${escapeHtml(example?.exampleContent || "")}</textarea></div>
          <div class="field"><label>為什麼這則好 why_it_works</label><textarea name="whyItWorks">${escapeHtml(example?.whyItWorks || "")}</textarea></div>
          <div class="field"><label>使用建議 usage_note</label><textarea name="usageNote">${escapeHtml(example?.usageNote || "")}</textarea></div>
          <div class="field"><label>給 AI 的使用提示 ai_instruction</label><textarea name="aiInstruction" placeholder="例如：模仿短句節奏，不要直接複製">${escapeHtml(example?.aiInstruction || "")}</textarea></div>
          <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-style-example-modal" ${isStyleExampleSaving ? "disabled" : ""}>取消</button><button class="primary-button" type="submit" ${isStyleExampleSaving ? "disabled" : ""}>${isStyleExampleSaving ? "儲存中..." : "儲存"}</button></div>
        </form>
      </section>
    </div>`;
}

function styleExamplesPage() {
  const visibleExamples = mockData.aiStyleExamples.filter(styleExampleMatchesFilters);
  const typeCounts = Object.entries(mockData.aiStyleExamples.reduce((counts, example) => {
    const key = example.type || "未分類";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}));
  return `
    <section class="review-hero">
      <div>
        <h2>AI 風格範例庫</h2>
        <p>管理 OpenAI 產生貼文、CTA、留言回覆、互動題與數據分析時可參考的風格範例。</p>
      </div>
      <button class="primary-button" type="button" data-action="open-style-example-modal">新增範例</button>
    </section>
    ${styleExamplesError ? `<div class="task-item" style="margin-bottom:16px"><strong>AI 風格範例庫提示</strong><span class="muted">${escapeHtml(styleExamplesError)}</span></div>` : ""}
    ${styleExamplesNotice ? `<div class="task-item" style="margin-bottom:16px"><strong>更新成功</strong><span class="muted">${escapeHtml(styleExamplesNotice)}</span></div>` : ""}
    ${styleExamplesLoading ? `<div class="task-item" style="margin-bottom:16px"><strong>讀取風格範例中...</strong><span class="muted">正在從 Supabase 載入 ai_style_examples 資料表</span></div>` : ""}
    <div class="grid stats-grid question-stats">
      ${styleExampleStats().map(([label, value, note]) => `<article class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("")}
    </div>
    <section class="card question-filter-card"><div class="card-body">
      <div class="question-filter-grid">
        <label class="filter-field filter-wide"><span>搜尋範例內容</span><input class="input style-filter-input" data-filter="search" value="${escapeHtml(styleExampleFilters.search)}" placeholder="搜尋範例、語氣、好在哪裡、使用建議或標籤" /></label>
        ${styleFilterSelect("type", "類型")}
        ${styleFilterSelect("platform", "平台")}
        ${styleFilterSelect("movieGenre", "電影類型")}
        ${styleFilterSelect("campaignStage", "宣傳情境")}
      </div>
    </div></section>
    <section class="card" style="margin-top:16px">
      <div class="card-header"><div><h2>範例分類</h2><p>目前顯示 ${visibleExamples.length} 筆；OpenAI 會優先讀取啟用、分數高且條件相符的範例。</p></div></div>
      <div class="card-body">
        <div class="meta-row">${typeCounts.map(([type, count]) => `<span class="tag">${escapeHtml(type)} ${count}</span>`).join("") || `<span class="muted">目前尚無範例。</span>`}</div>
      </div>
    </section>
    <div class="style-example-grid">
      ${visibleExamples.map(styleExampleCard).join("") || `<article class="card"><div class="card-body"><h3>找不到符合條件的範例</h3><p class="muted">請調整搜尋或篩選條件，或新增第一筆範例。</p></div></article>`}
    </div>
    ${isStyleExampleModalOpen ? styleExampleModal() : ""}`;
}

function uniqueQuestionOptions(key) {
  return ["全部", ...new Set(mockData.questions.map((item) => item[key]).filter(Boolean))];
}

function questionMatchesFilters(question) {
  const keyword = questionFilters.search.trim().toLowerCase();
  const keywordMatch = !keyword || [question.content, question.cta, question.asset, question.note]
    .some((value) => String(value || "").toLowerCase().includes(keyword));
  return keywordMatch &&
    (questionFilters.movieId === "全部" || question.movieId === questionFilters.movieId) &&
    (questionFilters.platform === "全部" || question.platform === questionFilters.platform) &&
    (questionFilters.type === "全部" || question.type === questionFilters.type) &&
    (questionFilters.tone === "全部" || question.tone === questionFilters.tone) &&
    (questionFilters.phase === "全部" || question.phase === questionFilters.phase) &&
    (questionFilters.status === "全部" || question.status === questionFilters.status) &&
    (questionFilters.performance === "全部" || question.performance === questionFilters.performance);
}

function questionStats() {
  const weekAgo = addDays(new Date(), -7);
  return [
    ["總題目數", mockData.questions.length, "題庫總量"],
    ["可使用題目", mockData.questions.filter((item) => item.status === "可使用").length, "可直接排程"],
    ["已排程題目", mockData.questions.filter((item) => item.status === "已排程").length, "已加入社群排程"],
    ["高效題", mockData.questions.filter((item) => item.performance === "高").length, "表現突出"],
    ["本週新增題目", mockData.questions.filter((item) => (parseLocalDate(item.createdAt) || new Date(0)) >= weekAgo).length, "近 7 日"],
  ];
}

function questionSelect(name, value, options, label) {
  return `<label class="filter-field"><span>${label}</span><select class="select question-filter" data-filter="${name}">${options.map((item) => option(item, value)).join("")}</select></label>`;
}

function questionMovieSelect(value) {
  const options = [
    option("全部", value, "全部電影"),
    ...mockData.movies.map((movie) => option(movie.id, value, movieDisplayName(movie))),
  ];
  return `<label class="filter-field"><span>電影專案</span><select class="select question-filter" data-filter="movieId">${options.join("")}</select></label>`;
}

function questionCard(question) {
  const highClass = question.performance === "高" ? " question-card-high" : "";
  const usedButtonText = question.status === "已使用" ? "取消已使用" : "標記已使用";
  return `
    <article class="card question-card${highClass}">
      <div class="card-body">
        <div class="question-card-top">
          <div>
            <p class="question-content">${escapeHtml(question.content)}</p>
            <div class="meta-row">
              <span class="tag">${escapeHtml(question.type)}</span>
              <span class="tag">${escapeHtml(question.platform)}</span>
              <span class="tag">${escapeHtml(question.tone)}</span>
              <span class="tag">${escapeHtml(question.phase)}</span>
              ${status(question.status)}
              ${question.performance === "高" ? `<span class="status green">高效題</span>` : ""}
            </div>
          </div>
          <strong class="performance performance-${question.performance}">${escapeHtml(question.performance)}</strong>
        </div>
        <div class="question-detail-grid">
          <div><span class="muted">電影專案</span><strong>${escapeHtml(questionMovieName(question.movieId))}</strong></div>
          <div><span class="muted">建議 CTA</span><strong>${escapeHtml(question.cta)}</strong></div>
          <div><span class="muted">建議搭配素材</span><strong>${escapeHtml(question.asset)}</strong></div>
          <div><span class="muted">使用狀態</span><strong>${question.uses} 次｜${escapeHtml(question.lastUsed || "尚未使用")}</strong></div>
        </div>
        <p class="muted question-note">${escapeHtml(question.note || "無備註")}</p>
        <div class="question-actions">
          <button class="secondary-button" type="button" data-action="copy-question" data-question-id="${question.id}">複製題目</button>
          <button class="secondary-button" type="button" data-action="rewrite-question" data-question-id="${question.id}">AI 改寫</button>
          <button class="secondary-button" type="button" data-action="similar-question" data-question-id="${question.id}">產生相似題</button>
          <button class="primary-button" type="button" data-action="schedule-question" data-question-id="${question.id}">加入排程</button>
          <button class="secondary-button" type="button" data-action="mark-question-used" data-question-id="${question.id}">${usedButtonText}</button>
          <button class="secondary-button" type="button" data-action="mark-question-high" data-question-id="${question.id}">標記高效題</button>
          <button class="secondary-button" type="button" data-action="edit-question" data-question-id="${question.id}">編輯</button>
          <button class="secondary-button" type="button" data-action="delete-question" data-question-id="${question.id}">刪除</button>
        </div>
      </div>
    </article>`;
}

function questionModal() {
  const question = mockData.questions.find((item) => item.id === editingQuestionId);
  const movieOptions = [option("", question?.movieId || "", "通用題目"), ...mockData.movies.map((movie) => option(movie.id, question?.movieId || "", movieDisplayName(movie)))].join("");
  return `
    <div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true">
      <div class="modal-header"><div><h2>${question ? "編輯題目" : "新增題目"}</h2><p>管理小編每天可使用的社群互動題。</p></div><button class="icon-button modal-close" type="button" data-action="close-question-modal">×</button></div>
      <form id="questionForm" class="modal-form">
        <div class="field"><label>題目內容</label><textarea name="content" required>${escapeHtml(question?.content || "")}</textarea></div>
        <div class="field"><label>電影專案</label><select class="select" name="movieId" style="width:100%">${movieOptions}</select></div>
        <div class="field"><label>題型</label><select class="select" name="type" style="width:100%">${["開放問答", "二選一", "投票", "測驗", "留言引導", "Reels 字卡"].map((item) => option(item, question?.type || "開放問答")).join("")}</select></div>
        <div class="field"><label>平台</label><select class="select" name="platform" style="width:100%">${["IG 限動", "Threads", "Facebook", "Reels"].map((item) => option(item, question?.platform || "IG 限動")).join("")}</select></div>
        <div class="field"><label>語氣</label><select class="select" name="tone" style="width:100%">${["親切", "神祕", "熱血", "幽默", "感性", "懸疑"].map((item) => option(item, question?.tone || "親切")).join("")}</select></div>
        <div class="field"><label>宣傳階段</label><select class="select" name="phase" style="width:100%">${["前導期", "預告上線", "上映倒數", "上映中", "口碑擴散"].map((item) => option(item, question?.phase || "預告上線")).join("")}</select></div>
        <div class="field"><label>狀態</label><select class="select" name="status" style="width:100%">${["可使用", "草稿", "已排程", "已使用", "停用"].map((item) => option(item, question?.status || "可使用")).join("")}</select></div>
        <div class="field"><label>建議 CTA</label><input class="input" name="cta" value="${escapeHtml(question?.cta || "回覆或留言告訴我們")}" /></div>
        <div class="field"><label>建議搭配素材</label><input class="input" name="asset" value="${escapeHtml(question?.asset || "主視覺海報")}" /></div>
        <div class="field"><label>備註</label><textarea name="note">${escapeHtml(question?.note || "")}</textarea></div>
        <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-question-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
      </form>
    </section></div>`;
}

function questionScheduleModal() {
  const question = mockData.questions.find((item) => item.id === schedulingQuestionId);
  return `
    <div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true">
      <div class="modal-header"><div><h2>加入排程</h2><p>把互動題快速加入社群排程清單。</p></div><button class="icon-button modal-close" type="button" data-action="close-question-schedule-modal">×</button></div>
      <form id="questionScheduleForm" class="modal-form">
        <div class="field"><label>發布日期</label><input class="input" name="date" type="date" required value="${formatDateForInput(formatWeekDate(new Date()))}" /></div>
        <div class="field"><label>平台</label><select class="select" name="platform" style="width:100%">${["Facebook", "Instagram", "Threads", "Instagram Reels", "TikTok"].map((item) => option(item, question?.platform?.includes("IG") ? "Instagram" : question?.platform || "Facebook")).join("")}</select></div>
        <div class="field"><label>文案內容</label><textarea name="copy" required>${escapeHtml(question?.content || "")}</textarea></div>
        <div class="field"><label>狀態</label><select class="select" name="status" style="width:100%">${scheduleStatuses.map((item) => option(item, "草稿")).join("")}</select></div>
        <div class="field"><label>負責人</label><input class="input" name="owner" value="社群小編" required /></div>
        <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-question-schedule-modal">取消</button><button class="primary-button" type="submit">加入排程</button></div>
      </form>
    </section></div>`;
}

function questionAiPanel() {
  if (!questionAiResult) return "";
  return `<section class="card question-ai-panel"><div class="card-header"><div><h2>${escapeHtml(questionAiResult.title)}</h2><p>${escapeHtml(questionAiResult.note || "AI 產生結果，可複製後新增到題庫。")}</p></div></div><div class="card-body list">${questionAiResult.items.map((item) => `<div class="copy-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("")}</div></section>`;
}

function reviewPage() {
  const visibleQuestions = mockData.questions.filter(questionMatchesFilters);
  return `
    <section class="review-hero">
      <div>
        <h2>互動問答題庫</h2>
        <p>管理 IG 限動、Threads、Facebook、Reels 等社群互動題</p>
      </div>
      <div class="meta-row"><button class="primary-button" type="button" data-action="open-question-modal">新增題目</button><button class="secondary-button" type="button" data-action="ai-generate-questions" ${isQuestionAiGenerating ? "disabled" : ""}>${isQuestionAiGenerating ? "生成中..." : "用 AI 生成題目"}</button></div>
    </section>
    <div class="grid stats-grid question-stats">${questionStats().map(([label, value, note]) => `<article class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("")}</div>
    <section class="card question-filter-card"><div class="card-body">
      <div class="question-filter-grid">
        <label class="filter-field filter-wide"><span>搜尋題目關鍵字</span><input class="input question-filter-input" data-filter="search" value="${escapeHtml(questionFilters.search)}" placeholder="輸入題目、CTA、素材或備註" /></label>
        ${questionMovieSelect(questionFilters.movieId)}
        ${questionSelect("platform", questionFilters.platform, uniqueQuestionOptions("platform"), "平台")}
        ${questionSelect("type", questionFilters.type, uniqueQuestionOptions("type"), "題型")}
        ${questionSelect("tone", questionFilters.tone, uniqueQuestionOptions("tone"), "語氣")}
        ${questionSelect("phase", questionFilters.phase, uniqueQuestionOptions("phase"), "宣傳階段")}
        ${questionSelect("status", questionFilters.status, uniqueQuestionOptions("status"), "狀態")}
        ${questionSelect("performance", questionFilters.performance, uniqueQuestionOptions("performance"), "表現")}
      </div>
    </div></section>
    ${questionAiPanel()}
    <div class="question-grid">${visibleQuestions.map(questionCard).join("") || `<article class="card"><div class="card-body"><h3>找不到符合條件的題目</h3><p class="muted">請調整搜尋或篩選條件。</p></div></article>`}</div>
    ${isQuestionModalOpen ? questionModal() : ""}
    ${isQuestionScheduleModalOpen ? questionScheduleModal() : ""}
  `;
}
function analyticsTotals() {
  return analyticsMetricsForSelectedMovie().reduce(
    (totals, item) => ({
      reach: totals.reach + Number(item.reach || 0),
      impressions: totals.impressions + Number(item.impressions || 0),
      views: totals.views + Number(item.views || 0),
      likes: totals.likes + Number(item.likes || 0),
      comments: totals.comments + Number(item.comments || 0),
      shares: totals.shares + Number(item.shares || 0),
      saves: totals.saves + Number(item.saves || 0),
      newFollowers: totals.newFollowers + Number(item.newFollowers || 0),
      linkClicks: totals.linkClicks + Number(item.linkClicks || 0),
    }),
    { reach: 0, impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, newFollowers: 0, linkClicks: 0 },
  );
}

function analyticsMetricsForSelectedMovie() {
  const movie = getSelectedAnalyticsMovie();
  return movie ? mockData.socialMetrics.filter((metric) => metric.movieId === movie.id) : [];
}

function postAnalysesForSelectedMovie() {
  const movie = getSelectedAnalyticsMovie();
  return movie ? savedPostAnalyses.filter((analysis) => (analysis.movieId || analysis.data?.movieId) === movie.id) : [];
}

function engagementRate(item) {
  const reach = Number(item.reach || 0);
  if (!reach) return 0;
  return ((Number(item.likes || 0) + Number(item.comments || 0) + Number(item.shares || 0) + Number(item.saves || 0)) / reach) * 100;
}

function metricRate(item, key) {
  const reach = Number(item.reach || 0);
  return reach ? (Number(item[key] || 0) / reach) * 100 : 0;
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function postNumber(formData, key) {
  return Number(formData.get(key) || 0);
}

function calculatePostAnalysis(formData) {
  const movieId = String(formData.get("movieId") || selectedAnalyticsMovieId || "");
  const data = {
    movieId,
    platform: formData.get("platform") || "Instagram",
    postUrl: String(formData.get("post_url") || "").trim(),
    title: String(formData.get("title") || "未命名貼文").trim(),
    postDate: formData.get("post_date") || "",
    postType: formData.get("post_type") || "圖文",
    campaignStage: formData.get("campaign_stage") || "上映前",
    impressions: postNumber(formData, "impressions"),
    reach: postNumber(formData, "reach"),
    views: postNumber(formData, "views"),
    likes: postNumber(formData, "likes"),
    comments: postNumber(formData, "comments"),
    shares: postNumber(formData, "shares"),
    saves: postNumber(formData, "saves"),
    newFollowers: postNumber(formData, "new_followers"),
    linkClicks: postNumber(formData, "link_clicks"),
  };
  const totalEngagements = data.likes + data.comments + data.shares + data.saves;
  const rate = (value) => (data.reach ? value / data.reach : 0);
  const metrics = {
    totalEngagements,
    engagementRate: rate(totalEngagements),
    shareRate: rate(data.shares),
    saveRate: rate(data.saves),
    commentRate: rate(data.comments),
    followerConversionRate: rate(data.newFollowers),
    clickRate: rate(data.linkClicks),
  };
  const labels = [];
  if (metrics.engagementRate >= 0.06 && metrics.followerConversionRate < 0.01) labels.push("高互動、低轉粉型");
  if (data.reach >= 50000 && metrics.engagementRate < 0.03) labels.push("高觸及、低互動型");
  if (metrics.shareRate >= 0.01 || data.shares > data.saves) labels.push("高分享擴散型");
  if (metrics.saveRate >= 0.01 || data.saves > data.shares) labels.push("高收藏保存型");
  if (metrics.engagementRate >= 0.06 && metrics.followerConversionRate >= 0.01) labels.push("高價值轉換型內容");
  if (!labels.length) labels.push("表現普通、需要優化型");
  const primary = labels[0];
  const report = {
    summary: labels.join("、"),
    interpretation: [
      `這篇貼文總互動數為 ${formatNumber(totalEngagements)}，互動率 ${percent(metrics.engagementRate)}。`,
      `分享率 ${percent(metrics.shareRate)}、收藏率 ${percent(metrics.saveRate)}，${data.shares > data.saves ? "目前更偏向擴散與話題傳播。" : data.saves > data.shares ? "目前更偏向資訊保存與後續回看。" : "分享與收藏接近，內容兼具擴散與保存價值。"}`,
      `追蹤轉換率 ${percent(metrics.followerConversionRate)}、點擊率 ${percent(metrics.clickRate)}，可用來判斷是否有把互動轉成下一步行動。`,
    ],
    problems: [
      metrics.engagementRate < 0.03 ? "互動率偏低，可能是開頭鉤子、視覺停留點或 CTA 不夠明確。" : "互動率具備基礎表現，下一步應觀察留言品質與互動是否轉成追蹤或點擊。",
      data.reach > 0 && data.impressions > data.reach * 1.8 ? "曝光數明顯高於觸及，代表有重複觀看或重複曝光，但需要確認是否轉成有效互動。" : "曝光與觸及差距不大，可優先提升內容本身的停留與互動設計。",
      metrics.followerConversionRate < 0.01 ? "轉粉偏低，可能缺少追蹤理由、帳號定位提示或下一步誘因。" : "轉粉表現不錯，可以把這篇的主題或格式延伸成系列內容。",
    ],
    nextSteps: [
      primary === "高價值轉換型內容" ? "下一篇建議延續相同主題，改測不同平台或不同發文時間，確認是否可複製成固定內容模板。" : "下一篇建議保留這篇表現較好的元素，並強化前 3 秒鉤子與結尾 CTA。",
      data.saves > data.shares ? "可做成懶人包、角色資訊、上映資訊整理，讓收藏價值更明確。" : "可加入標記朋友、分享觀點或二選一討論，放大擴散效果。",
      metrics.clickRate < 0.005 ? "若目標是導流，下一篇請把購票、預告或活動連結放在更清楚的位置。" : "導流已有基礎，可以測試不同 CTA 文案，觀察點擊率是否提升。",
    ],
  };
  return { data, metrics, labels, report, savedAt: new Date().toLocaleString("zh-Hant-TW") };
}

function postAnalysisMetricCards(result) {
  const metrics = result?.metrics || {};
  return [
    ["總互動數", formatNumber(metrics.totalEngagements), "按讚 + 留言 + 分享 + 收藏"],
    ["互動率", percent(metrics.engagementRate), "總互動 / 觸及"],
    ["分享率", percent(metrics.shareRate), "分享 / 觸及"],
    ["收藏率", percent(metrics.saveRate), "收藏 / 觸及"],
    ["追蹤轉換率", percent(metrics.followerConversionRate), "新增追蹤 / 觸及"],
    ["點擊率", percent(metrics.clickRate), "連結點擊 / 觸及"],
  ];
}

function postAnalysisReportHtml() {
  if (!postAnalysisResult) {
    return `<section class="card post-analysis-empty"><div class="card-body"><h2>尚未產生分析</h2><p class="muted">輸入貼文基本資料與數據後，按下「分析貼文數據」即可產生報告。</p></div></section>`;
  }
  const { data, report, labels } = postAnalysisResult;
  return `
    <section class="card analytics-report">
      <div class="card-header"><div><h2>分析報告</h2><p>${escapeHtml(data.title)}｜${escapeHtml(data.platform)}｜${escapeHtml(data.campaignStage)}</p></div></div>
      <div class="card-body">
        <div class="meta-row">${labels.map((item) => `<span class="status ${item.includes("高價值") ? "green" : item.includes("低") ? "amber" : "blue"}">${escapeHtml(item)}</span>`).join("")}</div>
        <div class="analytics-report-grid">
          <div><h3>整體判斷</h3><p>${escapeHtml(report.summary)}</p></div>
          <div><h3>數據解讀</h3>${report.interpretation.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
          <div><h3>可能問題</h3>${report.problems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
          <div><h3>下一篇建議</h3>${report.nextSteps.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        </div>
      </div>
    </section>`;
}

function postAnalysisGeneratedOutputHtml() {
  if (!postAnalysisOutput) return "";
  return `
    <section class="card">
      <div class="card-header"><div><h2>${escapeHtml(postAnalysisOutput.title)}</h2><p>依目前貼文數據用程式邏輯產生，尚未串接 AI。</p></div></div>
      <div class="card-body copy-grid">${postAnalysisOutput.items.map((item) => `<div class="copy-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("")}</div>
    </section>`;
}

function platformBriefAnalysis(item) {
  const engagement = engagementRate(item);
  const followRate = metricRate(item, "newFollowers");
  if (engagement >= 6 && followRate < 1) return "互動熱度高，但追蹤轉換仍可加強。";
  if (Number(item.reach || 0) >= 50000 && engagement < 3) return "觸及不錯，但需要更強的互動鉤子。";
  if (metricRate(item, "shares") >= 1) return "分享率突出，適合放大話題擴散。";
  if (metricRate(item, "saves") >= 1) return "收藏率佳，適合延伸資訊型內容。";
  if (engagement >= 6 && followRate >= 1) return "互動與轉粉都好，可整理成模板。";
  return "表現穩定，建議持續測試素材與 CTA。";
}

function platformOverviewCards() {
  const knownPlatforms = ["Instagram", "Facebook", "Threads", "YouTube"];
  const metrics = analyticsMetricsForSelectedMovie();
  return knownPlatforms.map((platform) => {
    const item = metrics.find((metric) => metric.platform === platform || metric.platform?.includes(platform)) || { platform };
    const interactions = metricInteractions(item);
    return `
      <article class="card stat-card">
        <span>${escapeHtml(platform)}</span>
        <strong>${formatNumber(interactions)}</strong>
        <small>互動數</small>
        <div class="metric-mini-grid">
          <span>觸及 ${formatNumber(item.reach)}</span>
          <span>曝光 ${formatNumber(item.impressions)}</span>
          <span>互動率 ${engagementRate(item).toFixed(2)}%</span>
          <span>新增追蹤 ${formatNumber(item.newFollowers)}</span>
          <span>轉粉率 ${metricRate(item, "newFollowers").toFixed(2)}%</span>
        </div>
        <p class="muted">${escapeHtml(platformBriefAnalysis(item))}</p>
      </article>`;
  }).join("");
}

function metricInteractions(item) {
  return Number(item.likes || 0) + Number(item.comments || 0) + Number(item.shares || 0) + Number(item.saves || 0);
}

function summarizeMetrics(metrics) {
  return metrics.reduce(
    (totals, item) => ({
      reach: totals.reach + Number(item.reach || 0),
      likes: totals.likes + Number(item.likes || 0),
      comments: totals.comments + Number(item.comments || 0),
      shares: totals.shares + Number(item.shares || 0),
      saves: totals.saves + Number(item.saves || 0),
      newFollowers: totals.newFollowers + Number(item.newFollowers || 0),
      linkClicks: totals.linkClicks + Number(item.linkClicks || 0),
      interactions: totals.interactions + metricInteractions(item),
    }),
    { reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, newFollowers: 0, linkClicks: 0, interactions: 0 },
  );
}

function rateFromTotals(totals, key) {
  return totals.reach ? (Number(totals[key] || 0) / totals.reach) * 100 : 0;
}

function rateLabel(value, high, medium) {
  if (value >= high) return "高";
  if (value >= medium) return "中";
  return "低";
}

function buildManualAnalyticsReport(metrics) {
  const totals = summarizeMetrics(metrics);
  const sortedByEngagement = [...metrics].sort((a, b) => engagementRate(b) - engagementRate(a));
  const sortedByReach = [...metrics].sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0));
  const sortedByClick = [...metrics].sort((a, b) => metricRate(b, "linkClicks") - metricRate(a, "linkClicks"));
  const bestEngagement = sortedByEngagement[0];
  const weakestEngagement = sortedByEngagement[sortedByEngagement.length - 1];
  const bestReach = sortedByReach[0];
  const bestClick = sortedByClick[0];
  const engagement = rateFromTotals(totals, "interactions");
  const commentRate = rateFromTotals(totals, "comments");
  const shareRate = rateFromTotals(totals, "shares");
  const saveRate = rateFromTotals(totals, "saves");
  const followRate = rateFromTotals(totals, "newFollowers");
  const clickRate = rateFromTotals(totals, "linkClicks");
  const sourceLinks = metrics.map((item) => item.url).filter(Boolean);
  const source = sourceLinks.length ? `手動分析 ${sourceLinks.length} 則連結：${sourceLinks.join("、")}` : `手動分析 ${metrics.length} 筆社群數據`;
  const insights = [
    `整體互動率為 ${engagement.toFixed(2)}%，表現屬於「${rateLabel(engagement, 6, 3)}」。總互動 ${formatNumber(totals.interactions)} 次，來自按讚、留言、分享與收藏。`,
    bestEngagement ? `${bestEngagement.platform} 互動率最高，達 ${engagementRate(bestEngagement).toFixed(2)}%，適合優先觀察該篇內容的主題、文案鉤子與素材形式。` : "目前沒有可比較的互動資料。",
    bestReach ? `${bestReach.platform} 觸及最高，共 ${formatNumber(bestReach.reach)}，代表它最適合承擔擴散或曝光任務。` : "目前沒有觸及資料可判讀。",
    `留言率 ${commentRate.toFixed(2)}%、分享率 ${shareRate.toFixed(2)}%、收藏率 ${saveRate.toFixed(2)}%，可分別判斷討論度、擴散力與內容保存價值。`,
    `追蹤轉換率 ${followRate.toFixed(2)}%、點擊率 ${clickRate.toFixed(2)}%。${bestClick ? `${bestClick.platform} 的點擊率最高（${metricRate(bestClick, "linkClicks").toFixed(2)}%），最值得檢查 CTA 與連結位置。` : ""}`,
  ];
  const actions = [
    bestEngagement ? `把 ${bestEngagement.platform} 的高互動元素整理成模板，下一週至少再測 1 則相同語氣或題型的內容。` : "先補齊至少 2 筆平台數據，才有足夠基準比較內容表現。",
    weakestEngagement && weakestEngagement !== bestEngagement ? `${weakestEngagement.platform} 互動率較低（${engagementRate(weakestEngagement).toFixed(2)}%），建議調整開頭鉤子、縮短文案或改成問答式 CTA。` : "若各平台互動接近，下一步可用相同素材測不同發文時間。",
    saveRate >= shareRate ? "收藏率高於分享率，內容偏向資訊保存型；可改做懶人包、角色介紹或上映資訊整理。" : "分享率高於收藏率，內容具擴散力；可加強話題標籤與朋友標記 CTA。",
    clickRate < 0.5 && totals.linkClicks > 0 ? "點擊率偏低，建議把購票、預告或活動連結放在更明顯的位置，並在文案前段加入明確行動理由。" : "持續記錄連結點擊，並和觸及一起看，避免只用按讚判斷成效。",
  ];
  return {
    source,
    highlights: [
      { title: "分析筆數", text: `${metrics.length} 筆` },
      { title: "總觸及", text: formatNumber(totals.reach) },
      { title: "整體互動率", text: `${engagement.toFixed(2)}%` },
      { title: "最佳表現", text: bestEngagement ? `${bestEngagement.platform}（${engagementRate(bestEngagement).toFixed(2)}%）` : "尚無資料" },
      { title: "追蹤轉換率", text: `${followRate.toFixed(2)}%` },
      { title: "點擊率", text: `${clickRate.toFixed(2)}%` },
    ],
    insights,
    actions,
  };
}

function buildMovieAnalyticsReport() {
  const movie = getSelectedAnalyticsMovie();
  const metrics = analyticsMetricsForSelectedMovie();
  const analyses = postAnalysisResult ? [postAnalysisResult, ...postAnalysesForSelectedMovie()] : postAnalysesForSelectedMovie();
  const totals = summarizeMetrics(metrics);
  const bestPlatform = [...metrics].sort((a, b) => engagementRate(b) - engagementRate(a))[0];
  const weakestPlatform = [...metrics].filter((item) => Number(item.reach || 0) || metricInteractions(item)).sort((a, b) => engagementRate(a) - engagementRate(b))[0];
  const latestAnalysis = analyses[0];
  const engagement = rateFromTotals(totals, "interactions");
  const followRate = rateFromTotals(totals, "newFollowers");
  const contentType = latestAnalysis?.labels?.[0] || (engagement >= 6 && followRate >= 1 ? "高價值轉換型內容" : engagement >= 6 ? "高互動、低轉粉型" : "表現普通、需要優化型");
  return {
    source: `${movie ? movieDisplayName(movie) : "未選擇電影"}｜電影社群數據分析`,
    highlights: [
      { title: "整體表現", text: metrics.length ? `整體互動率 ${engagement.toFixed(2)}%，追蹤轉換率 ${followRate.toFixed(2)}%。` : "目前尚無平台數據。" },
      { title: "表現最好平台", text: bestPlatform ? `${bestPlatform.platform}（互動率 ${engagementRate(bestPlatform).toFixed(2)}%）` : "尚無資料" },
      { title: "表現最弱平台", text: weakestPlatform ? `${weakestPlatform.platform}（互動率 ${engagementRate(weakestPlatform).toFixed(2)}%）` : "尚無資料" },
      { title: "貼文類型", text: contentType },
    ],
    insights: [
      latestAnalysis ? `最新單篇「${latestAnalysis.data.title}」被判斷為「${latestAnalysis.labels.join("、")}」。` : "尚未建立單篇貼文分析，建議先輸入一篇貼文數據。",
      bestPlatform ? `${bestPlatform.platform} 目前最適合作為這部電影的主力社群觀察平台。` : "目前還沒有可比較的平台。",
      weakestPlatform && bestPlatform && weakestPlatform.platform !== bestPlatform.platform ? `${weakestPlatform.platform} 互動較弱，可優先檢查素材、文案開頭與 CTA 是否清楚。` : "各平台差異尚不明顯，可以先累積更多貼文數據。",
    ],
    actions: [
      contentType.includes("低轉粉") ? "下一篇請加入更明確的追蹤理由，例如幕後、角色解析或上映提醒系列。" : "下一篇可延伸目前表現較好的素材形式，測試不同發文時間。",
      totals.saves >= totals.shares ? "收藏高於分享，建議做懶人包、角色資訊或上映資訊整理。" : "分享高於收藏，建議加入朋友標記、二選一或話題提問放大擴散。",
      "每週固定保存單篇貼文分析，累積到 5 篇後會更容易看出內容規律。",
    ],
  };
}

function aiPostAnalysisPayload() {
  if (!postAnalysisResult) return null;
  const movie = mockData.movies.find((item) => item.id === postAnalysisResult.data.movieId) || getSelectedAnalyticsMovie();
  const { data, metrics } = postAnalysisResult;
  return {
    movieTitle: movie ? movieDisplayName(movie) : "未提供",
    movieGenre: movie?.genre || "",
    platform: data.platform,
    postUrl: data.postUrl,
    title: data.title,
    postType: data.postType,
    campaignStage: data.campaignStage,
    impressions: data.impressions,
    reach: data.reach,
    views: data.views,
    likes: data.likes,
    comments: data.comments,
    shares: data.shares,
    saves: data.saves,
    newFollowers: data.newFollowers,
    linkClicks: data.linkClicks,
    totalEngagements: metrics.totalEngagements,
    engagementRate: Number((metrics.engagementRate * 100).toFixed(2)),
    shareRate: Number((metrics.shareRate * 100).toFixed(2)),
    saveRate: Number((metrics.saveRate * 100).toFixed(2)),
    commentRate: Number((metrics.commentRate * 100).toFixed(2)),
    followerConversionRate: Number((metrics.followerConversionRate * 100).toFixed(2)),
    clickRate: Number((metrics.clickRate * 100).toFixed(2)),
  };
}

async function generateAIAnalysis() {
  const payload = aiPostAnalysisPayload();
  if (!payload) {
    aiPostAnalysisError = "請先輸入貼文數據並按「分析貼文數據」。";
    render();
    return;
  }
  isAiPostAnalyzing = true;
  aiPostAnalysisError = "";
  render();
  try {
    const response = await fetch("/api/ai/analyze-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI 分析產生失敗");
    aiPostAnalysisText = result.analysis || "";
  } catch (error) {
    aiPostAnalysisError = error.message || "AI 分析產生失敗";
  } finally {
    isAiPostAnalyzing = false;
    render();
  }
}

function metricModal() {
  const metric = analyticsMetricsForSelectedMovie().find((item) => item.platform === editingMetricPlatform) || {};
  return `
    <div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true">
      <div class="modal-header"><div><h2>${metric.platform ? "編輯數據" : "新增平台數據"}</h2><p>手動更新社群平台成效，資料會先存在瀏覽器。</p></div><button class="icon-button modal-close" type="button" data-action="close-metric-modal">×</button></div>
      <form id="metricForm" class="modal-form">
        <input type="hidden" name="movieId" value="${escapeHtml(selectedAnalyticsMovieId || "")}" />
        <div class="field"><label>平台</label><input class="input" name="platform" required value="${escapeHtml(metric.platform || "")}" ${metric.platform ? "readonly" : ""} /></div>
        <div class="field"><label>曝光</label><input class="input" name="impressions" type="number" min="0" value="${Number(metric.impressions || 0)}" /></div>
        <div class="field"><label>觸及</label><input class="input" name="reach" type="number" min="0" value="${Number(metric.reach || 0)}" /></div>
        <div class="field"><label>觀看</label><input class="input" name="views" type="number" min="0" value="${Number(metric.views || 0)}" /></div>
        <div class="field"><label>按讚</label><input class="input" name="likes" type="number" min="0" value="${Number(metric.likes || 0)}" /></div>
        <div class="field"><label>留言</label><input class="input" name="comments" type="number" min="0" value="${Number(metric.comments || 0)}" /></div>
        <div class="field"><label>分享</label><input class="input" name="shares" type="number" min="0" value="${Number(metric.shares || 0)}" /></div>
        <div class="field"><label>收藏</label><input class="input" name="saves" type="number" min="0" value="${Number(metric.saves || 0)}" /></div>
        <div class="field"><label>新增追蹤</label><input class="input" name="newFollowers" type="number" min="0" value="${Number(metric.newFollowers || 0)}" /></div>
        <div class="field"><label>連結點擊</label><input class="input" name="linkClicks" type="number" min="0" value="${Number(metric.linkClicks || 0)}" /></div>
        <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-metric-modal">取消</button><button class="primary-button" type="submit">儲存</button></div>
      </form>
    </section></div>`;
}

function analyticsReportHtml() {
  if (!analyticsReport) return "";
  return `
    <section class="card analytics-report">
      <div class="card-header"><div><h2>AI 分析報告</h2><p>${escapeHtml(analyticsReport.source)}</p></div><button class="secondary-button" type="button" data-action="clear-analytics-report">清除報告</button></div>
      <div class="card-body">
        <div class="grid three-col">
          ${analyticsReport.highlights.map((item) => `<div class="task-item"><div><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.text)}</span></div></div>`).join("")}
        </div>
        <div class="analytics-report-grid">
          <div><h3>重點觀察</h3>${analyticsReport.insights.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
          <div><h3>優化建議</h3>${analyticsReport.actions.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        </div>
      </div>
    </section>`;
}

function buildAnalyticsReportFromUrl(url) {
  const totals = analyticsTotals();
  const best = [...mockData.socialMetrics].sort((a, b) => engagementRate(b) - engagementRate(a))[0];
  const source = url ? `來源連結：${url}` : "來源：目前表格數據";
  return {
    source,
    highlights: [
      { title: "總觸及", text: formatNumber(totals.reach) },
      { title: "總互動", text: formatNumber(totals.likes + totals.comments + totals.shares + totals.saves) },
      { title: "連結點擊", text: formatNumber(totals.linkClicks) },
      { title: "最佳互動平台", text: best ? `${best.platform}（互動率 ${engagementRate(best).toFixed(2)}%）` : "尚無資料" },
    ],
    insights: [
      best ? `${best.platform} 目前互動率最高，適合作為下一波素材 A/B 測試的主平台。` : "目前資料不足，建議先補齊各平台數據。",
      `收藏數共 ${formatNumber(totals.saves)}，可觀察哪些素材具備二次回看價值。`,
      `連結點擊共 ${formatNumber(totals.linkClicks)}，可用來判斷貼文是否有效導流。`,
      `新增追蹤共 ${formatNumber(totals.newFollowers)}，建議對照發文主題與發布時間找出轉粉原因。`,
    ],
    actions: [
      "把高收藏內容改成短影音或限動二次露出，提高素材使用效率。",
      "針對留言較高的平台安排互動問答題，延長討論熱度。",
      "若連結來自單篇貼文，建議補上貼文截圖或後台數字，讓分析更精準。",
    ],
  };
}

function upsertSocialMetric(metric) {
  const normalized = {
    movieId: metric.movieId || selectedAnalyticsMovieId || mockData.movies[0]?.id || "",
    platform: metric.platform || "未知平台",
    impressions: Number(metric.impressions || 0),
    reach: Number(metric.reach || 0),
    views: Number(metric.views || 0),
    likes: Number(metric.likes || 0),
    comments: Number(metric.comments || 0),
    shares: Number(metric.shares || 0),
    saves: Number(metric.saves || 0),
    newFollowers: Number(metric.newFollowers || 0),
    linkClicks: Number(metric.linkClicks || 0),
  };
  const existing = mockData.socialMetrics.find((item) => item.movieId === normalized.movieId && item.platform === normalized.platform);
  if (existing) Object.assign(existing, normalized);
  else mockData.socialMetrics.push(normalized);
  writeStorage(storageKeys.metrics, mockData.socialMetrics);
}

function detectPlatformFromUrl(linkUrl, fallback = "手動輸入") {
  const value = String(linkUrl || "").toLowerCase();
  if (value.includes("instagram.com/reel")) return "Instagram Reels";
  if (value.includes("instagram.com")) return "Instagram";
  if (value.includes("threads.net")) return "Threads";
  if (value.includes("facebook.com") || value.includes("fb.watch")) return "Facebook";
  if (value.includes("tiktok.com")) return "TikTok";
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "YouTube Shorts";
  return fallback;
}

function manualAnalyticsRows() {
  return [0, 1, 2]
    .map(
      (index) => `
        <div class="manual-metric-row">
          <input class="input" name="url${index}" type="url" placeholder="社群連結 ${index + 1}" />
          <input class="input" name="platform${index}" placeholder="平台" />
          <input class="input" name="impressions${index}" type="number" min="0" placeholder="曝光" />
          <input class="input" name="reach${index}" type="number" min="0" placeholder="觸及" />
          <input class="input" name="views${index}" type="number" min="0" placeholder="觀看" />
          <input class="input" name="likes${index}" type="number" min="0" placeholder="按讚" />
          <input class="input" name="comments${index}" type="number" min="0" placeholder="留言" />
          <input class="input" name="shares${index}" type="number" min="0" placeholder="分享" />
          <input class="input" name="saves${index}" type="number" min="0" placeholder="收藏" />
          <input class="input" name="newFollowers${index}" type="number" min="0" placeholder="新增追蹤" />
          <input class="input" name="linkClicks${index}" type="number" min="0" placeholder="連結點擊" />
        </div>
      `,
    )
    .join("");
}

function analyticsPage() {
  const result = postAnalysisResult;
  const selectedMovie = getSelectedAnalyticsMovie();
  const movieReport = buildMovieAnalyticsReport();
  const today = new Date().toISOString().slice(0, 10);
  const aiAnalysisHtml = aiPostAnalysisText
    ? `<div class="copy-card"><strong>OpenAI 分析報告</strong><p>${escapeHtml(aiPostAnalysisText).replaceAll("\n", "<br>")}</p></div>`
    : `<div class="analytics-report-grid">
          <div><h3>整體解讀</h3>${movieReport.insights.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
          <div><h3>下一篇建議</h3>${movieReport.actions.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        </div>`;
  return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">電影社群數據分析工具</p>
        <h2>數據分析 Analytics</h2>
        <p>選擇電影後，只顯示該電影的社群平台數據與單篇貼文分析。</p>
      </div>
      <div class="task-item">
        <strong>電影選擇器</strong>
        <select class="select" id="analyticsMovieSelect" ${mockData.movies.length ? "" : "disabled"}>${mockData.movies.map((movie) => option(movie.id, selectedMovie?.id, movieDisplayName(movie))).join("") || "<option>尚無電影資料</option>"}</select>
        <span class="muted">${selectedMovie ? `${movieDisplayName(selectedMovie)}｜已儲存 ${postAnalysesForSelectedMovie().length} 筆分析` : "請先新增電影"}</span>
      </div>
    </section>

    <section class="card">
      <div class="card-header"><div><h2>平台數據總覽</h2><p>${selectedMovie ? `${movieDisplayName(selectedMovie)} 的 Instagram、Facebook、Threads、YouTube 數據` : "請先選擇電影"}</p></div></div>
      <div class="card-body grid stats-grid">${platformOverviewCards()}</div>
    </section>

    <form id="postAnalysisForm" class="post-analysis-layout">
      <section class="card">
        <div class="card-header"><div><h2>貼文基本資料</h2><p>建立這篇貼文的分析背景。</p></div></div>
        <div class="card-body post-form-grid">
          <input type="hidden" name="movieId" value="${escapeHtml(selectedMovie?.id || "")}" />
          <div class="field"><label>平台</label><select class="select" name="platform" required>${["Instagram", "Facebook", "Threads", "YouTube"].map((item) => option(item, result?.data.platform || "Instagram")).join("")}</select></div>
          <div class="field"><label>貼文連結</label><input class="input" name="post_url" type="url" value="${escapeHtml(result?.data.postUrl || "")}" placeholder="https://..." /></div>
          <div class="field field-wide"><label>貼文標題</label><input class="input" name="title" required value="${escapeHtml(result?.data.title || "")}" placeholder="例如：正式預告上線主貼文" /></div>
          <div class="field"><label>發文日期</label><input class="input" name="post_date" type="date" value="${escapeHtml(result?.data.postDate || today)}" /></div>
          <div class="field"><label>貼文類型</label><select class="select" name="post_type">${["圖文", "Reels", "短影音", "文字貼文"].map((item) => option(item, result?.data.postType || "圖文")).join("")}</select></div>
          <div class="field"><label>宣傳階段</label><select class="select" name="campaign_stage">${["上映前", "上映中", "下檔前", "口碑期"].map((item) => option(item, result?.data.campaignStage || "上映前")).join("")}</select></div>
        </div>
      </section>

      <section class="card">
        <div class="card-header"><div><h2>貼文數據</h2><p>填入後會自動計算互動率、轉粉率與點擊率。</p></div></div>
        <div class="card-body post-metric-grid">
          ${[
            ["impressions", "曝光數", result?.data.impressions],
            ["reach", "觸及數", result?.data.reach],
            ["views", "觀看數", result?.data.views],
            ["likes", "按讚數", result?.data.likes],
            ["comments", "留言數", result?.data.comments],
            ["shares", "分享數", result?.data.shares],
            ["saves", "收藏數", result?.data.saves],
            ["new_followers", "新增追蹤數", result?.data.newFollowers],
            ["link_clicks", "連結點擊數", result?.data.linkClicks],
          ].map(([name, label, value]) => `<div class="field"><label>${label}</label><input class="input" name="${name}" type="number" min="0" value="${Number(value || 0)}" /></div>`).join("")}
          <div class="modal-actions field-wide"><button class="primary-button" type="submit">分析貼文數據</button></div>
        </div>
      </section>
    </form>

    <div class="grid stats-grid post-analysis-stats">
      ${postAnalysisMetricCards(result).map(([label, value, note]) => `<article class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("")}
    </div>

    ${postAnalysisReportHtml()}
    <section class="card analytics-report">
      <div class="card-header"><div><h2>AI 分析報告</h2><p>${aiPostAnalysisText ? "由 OpenAI 依目前單篇貼文數據生成。" : "尚未產生 OpenAI 報告時，先顯示系統邏輯分析。"}</p></div></div>
      <div class="card-body">
        ${aiPostAnalysisError ? `<p class="status red">${escapeHtml(aiPostAnalysisError)}</p>` : ""}
        ${isAiPostAnalyzing ? `<p class="status blue">AI 分析中...</p>` : ""}
        <div class="grid three-col">${movieReport.highlights.map((item) => `<div class="task-item"><div><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.text)}</span></div></div>`).join("")}</div>
        ${aiAnalysisHtml}
      </div>
    </section>
    ${postAnalysisGeneratedOutputHtml()}

    <section class="card">
      <div class="card-header"><div><h2>後續操作</h2><p>依目前分析結果產生下一步內容方向。</p></div></div>
      <div class="card-body post-action-row">
        <button class="secondary-button" type="button" data-action="generate-next-post-direction" ${result ? "" : "disabled"}>產生下一篇貼文方向</button>
        <button class="primary-button" type="button" data-action="generate-ai-post-analysis" ${result && !isAiPostAnalyzing ? "" : "disabled"}>${isAiPostAnalyzing ? "AI 分析中..." : "產生 AI 分析報告"}</button>
        <button class="secondary-button" type="button" data-action="generate-comment-question" ${result ? "" : "disabled"}>產生留言互動題</button>
        <button class="secondary-button" type="button" data-action="generate-cta-copy" ${result ? "" : "disabled"}>產生 CTA 文案</button>
        <button class="secondary-button" type="button" data-action="generate-review-report" ${result ? "" : "disabled"}>產生檢討報告</button>
        <button class="secondary-button" type="button" data-action="export-analysis-summary" ${result ? "" : "disabled"}>匯出分析摘要</button>
        <button class="primary-button" type="button" data-action="save-post-analysis" ${result ? "" : "disabled"}>儲存分析</button>
      </div>
    </section>
  `;
}
const renderers = { dashboard, movies: moviesPage, assets: assetsPage, schedule: schedulePage, copy: copyPage, style: styleExamplesPage, review: reviewPage, analytics: analyticsPage };

function render() {
  if (!authChecked) {
    document.querySelector("#pageTitle").textContent = "系統登入";
    document.querySelector("#pageContent").innerHTML = `<section class="card"><div class="card-body"><p class="muted">正在檢查登入狀態...</p></div></section>`;
    renderNav("");
    return;
  }
  if (authRequired && !isAuthenticated) {
    document.querySelector("#pageTitle").textContent = "系統登入";
    document.querySelector("#pageContent").innerHTML = authPage();
    renderNav("");
    return;
  }
  const id = location.hash.replace("#", "") || "dashboard";
  const page = pages.find((item) => item.id === id) || pages[0];
  if (page.id !== "movies") {
    isMovieModalOpen = false;
    editingMovieId = null;
  }
  if (page.id !== "assets") {
    isAssetModalOpen = false;
    editingAssetId = null;
  }
  if (page.id !== "schedule") {
    isScheduleModalOpen = false;
    editingScheduleId = null;
  }
  if (page.id !== "dashboard") {
    isActivityModalOpen = false;
    editingActivityId = null;
  }
  if (page.id !== "review") {
    isQuestionModalOpen = false;
    editingQuestionId = null;
    isQuestionScheduleModalOpen = false;
    schedulingQuestionId = null;
  }
  if (page.id !== "style") {
    isStyleExampleModalOpen = false;
    editingStyleExampleId = null;
  }
  if (page.id !== "analytics") {
    isMetricModalOpen = false;
    editingMetricPlatform = null;
  }
  document.querySelector("#pageTitle").textContent = page.title;
  document.querySelector("#pageContent").innerHTML = renderers[page.id]();
  renderNav(page.id);
  if (["movies", "assets", "schedule", "copy", "review", "analytics"].includes(page.id) && Date.now() - moviesLastLoadedAt > 5000) loadMoviesFromServer(true);
  if (["assets", "schedule", "review", "analytics", "dashboard"].includes(page.id) && Date.now() - workflowLastLoadedAt > 5000) loadWorkflowDataFromServer();
  if (page.id === "style" && !styleExamplesLoadedFromServer) loadStyleExamplesFromServer(true);
}

window.addEventListener("hashchange", render);

document.addEventListener("input", (event) => {
  if (event.target.id === "copyFocus") {
    copyFocusValue = event.target.value;
    localStorage.setItem(storageKeys.copyFocus, copyFocusValue);
  }
  if (event.target.classList.contains("question-filter-input")) {
    const filterName = event.target.dataset.filter;
    const cursorPosition = event.target.selectionStart;
    questionFilters[filterName] = event.target.value;
    render();
    const input = document.querySelector(`.question-filter-input[data-filter="${filterName}"]`);
    input?.focus();
    input?.setSelectionRange(cursorPosition, cursorPosition);
  }
  if (event.target.classList.contains("style-filter-input")) {
    if (isTextComposing || event.isComposing) return;
    const filterName = event.target.dataset.filter;
    const cursorPosition = event.target.selectionStart;
    styleExampleFilters[filterName] = event.target.value;
    render();
    const input = document.querySelector(`.style-filter-input[data-filter="${filterName}"]`);
    input?.focus();
    input?.setSelectionRange(cursorPosition, cursorPosition);
  }
});

document.addEventListener("compositionstart", (event) => {
  if (event.target.classList?.contains("style-filter-input")) {
    isTextComposing = true;
  }
});

document.addEventListener("compositionend", (event) => {
  if (event.target.classList?.contains("style-filter-input")) {
    isTextComposing = false;
    const filterName = event.target.dataset.filter;
    styleExampleFilters[filterName] = event.target.value;
    render();
    const input = document.querySelector(`.style-filter-input[data-filter="${filterName}"]`);
    input?.focus();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "assetMovieSelect") {
    selectedAssetMovieId = event.target.value;
    localStorage.setItem(storageKeys.assetMovie, selectedAssetMovieId);
    isAssetModalOpen = false;
    editingAssetId = null;
    render();
    return;
  }
  if (event.target.id === "scheduleMovieSelect") {
    selectedScheduleMovieId = event.target.value;
    localStorage.setItem(storageKeys.scheduleMovie, selectedScheduleMovieId);
    isScheduleModalOpen = false;
    editingScheduleId = null;
    render();
    return;
  }
  if (event.target.id === "analyticsMovieSelect") {
    selectedAnalyticsMovieId = event.target.value;
    localStorage.setItem(storageKeys.analyticsMovie, selectedAnalyticsMovieId);
    postAnalysisResult = null;
    postAnalysisOutput = null;
    aiPostAnalysisText = "";
    aiPostAnalysisError = "";
    analyticsReport = null;
    render();
    return;
  }
  if (event.target.id === "copyMovie") {
    selectedCopyMovieId = event.target.value;
    localStorage.setItem(storageKeys.copyMovie, selectedCopyMovieId);
    generatedCopyResult = null;
    copyGeneratorError = "";
    render();
    return;
  }
  if (event.target.id === "scheduleAssetId") {
    const linkInput = document.getElementById("scheduleAssetLinkUrl");
    const selectedLink = assetLinkUrl(event.target.value);
    if (linkInput && selectedLink) linkInput.value = selectedLink;
    return;
  }
  if (event.target.id === "scheduleMovieId") {
    const assetSelect = document.getElementById("scheduleAssetId");
    const linkInput = document.getElementById("scheduleAssetLinkUrl");
    if (assetSelect) {
      assetSelect.innerHTML = `<option value="">未指定素材</option>${assetsForScheduleMovie(event.target.value).map((asset) => option(asset.id, "", asset.name)).join("")}`;
    }
    if (linkInput) linkInput.value = "";
    return;
  }
  if (event.target.classList.contains("schedule-status-select")) {
    const schedule = mockData.schedules.find((item) => item.id === event.target.dataset.scheduleId);
    if (schedule) {
      schedule.status = event.target.value;
      writeStorage(storageKeys.schedules, mockData.schedules);
    }
  }
  if (event.target.classList.contains("question-filter")) {
    questionFilters[event.target.dataset.filter] = event.target.value;
    render();
  }
  if (event.target.classList.contains("style-filter")) {
    styleExampleFilters[event.target.dataset.filter] = event.target.value;
    render();
  }
});

document.addEventListener("click", async (event) => {
  const actionElement = event.target.closest("[data-action]");
  const action = actionElement?.dataset.action;
  if (!action) return;

  if (action === "open-movie-modal") {
    isMovieModalOpen = true;
    editingMovieId = null;
    render();
  }
  if (action === "edit-movie") {
    editingMovieId = actionElement.dataset.movieId;
    isMovieModalOpen = true;
    render();
  }
  if (action === "close-movie-modal") {
    isMovieModalOpen = false;
    editingMovieId = null;
    render();
  }
  if (action === "delete-movie") {
    if (!window.confirm("確定要刪除這部電影嗎？")) return;
    try {
      await deleteMovieFromServer(actionElement.dataset.movieId);
    } catch (error) {
      moviesError = error.message;
      render();
    }
  }
  if (action === "add-movie-cover") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      await saveMovieCoverToServer(actionElement.dataset.movieId, await fileToCompressedCoverDataUrl(file));
      render();
    });
    input.click();
  }
  if (action === "open-asset-modal") {
    if (!getSelectedAssetMovie()) return window.alert("請先新增電影，再建立素材。");
    isAssetModalOpen = true;
    editingAssetId = null;
    render();
  }
  if (action === "edit-asset") {
    editingAssetId = actionElement.dataset.assetId;
    isAssetModalOpen = true;
    render();
  }
  if (action === "delete-asset") {
    if (!window.confirm("確定要刪除這筆素材嗎？")) return;
    mockData.assets = mockData.assets.filter((asset) => asset.id !== actionElement.dataset.assetId);
    writeStorage(storageKeys.assets, mockData.assets);
    render();
  }
  if (action === "open-asset-link") {
    const asset = mockData.assets.find((item) => item.id === actionElement.dataset.assetId);
    if (!asset?.linkUrl) return window.alert("這筆素材尚未設定外部連結。");
    window.open(asset.linkUrl, "_blank", "noopener");
  }
  if (action === "enable-asset-link") {
    const input = document.getElementById("assetLinkUrl");
    input?.focus();
  }
  if (action === "close-asset-modal") {
    isAssetModalOpen = false;
    editingAssetId = null;
    render();
  }
  if (action === "schedule-week-prev") {
    currentScheduleWeekStart = addDays(getScheduleWeekStart(), -7);
    render();
  }
  if (action === "schedule-week-next") {
    currentScheduleWeekStart = addDays(getScheduleWeekStart(), 7);
    render();
  }
  if (action === "open-schedule-modal") {
    if (!getSelectedScheduleMovie()) return window.alert("請先新增電影，再建立社群排程。");
    isScheduleModalOpen = true;
    editingScheduleId = null;
    render();
  }
  if (action === "edit-schedule") {
    editingScheduleId = actionElement.dataset.scheduleId;
    isScheduleModalOpen = true;
    render();
  }
  if (action === "open-schedule-asset-link") {
    const schedule = mockData.schedules.find((item) => item.id === actionElement.dataset.scheduleId);
    const link = scheduleAssetLink(schedule);
    if (!link) return window.alert("這筆排程尚未設定素材連結。");
    window.open(link, "_blank", "noopener");
  }
  if (action === "enable-schedule-link") {
    const input = document.getElementById("scheduleAssetLinkUrl");
    const assetSelect = document.getElementById("scheduleAssetId");
    const selectedLink = assetLinkUrl(assetSelect?.value || "");
    if (input && !input.value && selectedLink) input.value = selectedLink;
    input?.focus();
  }
  if (action === "delete-schedule") {
    if (!window.confirm("確定要刪除這筆排程嗎？")) return;
    mockData.schedules = mockData.schedules.filter((schedule) => schedule.id !== actionElement.dataset.scheduleId);
    writeStorage(storageKeys.schedules, mockData.schedules);
    render();
  }
  if (action === "close-schedule-modal") {
    isScheduleModalOpen = false;
    editingScheduleId = null;
    render();
  }
  if (action === "open-activity-modal") {
    if (!mockData.movies.length) return window.alert("請先新增電影，再建立近期活動。");
    isActivityModalOpen = true;
    editingActivityId = null;
    render();
  }
  if (action === "edit-activity") {
    editingActivityId = actionElement.dataset.activityId;
    isActivityModalOpen = true;
    render();
  }
  if (action === "delete-activity") {
    if (!window.confirm("確定要刪除這筆活動嗎？")) return;
    mockData.activities = mockData.activities.filter((activity) => activity.id !== actionElement.dataset.activityId);
    writeStorage(storageKeys.activities, mockData.activities);
    render();
  }
  if (action === "close-activity-modal") {
    isActivityModalOpen = false;
    editingActivityId = null;
    render();
  }
  if (action === "generate-next-post-direction") {
    if (!postAnalysisResult) return;
    const { data, metrics, labels } = postAnalysisResult;
    postAnalysisOutput = {
      title: "下一篇貼文方向",
      items: [
        { title: "主題方向", text: labels.includes("收藏型內容") ? `延伸「${data.title}」做成資訊整理或懶人包，強化可收藏價值。` : `延伸「${data.title}」的討論點，改成更容易分享的觀點型貼文。` },
        { title: "內容形式", text: metrics.engagementRate >= 0.06 ? `保留 ${data.postType} 形式，改測不同開頭鉤子或發布時間。` : "改用短影音或 Reels，前 3 秒直接放衝突、金句或角色反應。" },
        { title: "操作目標", text: metrics.followerConversionRate < 0.01 ? "下一篇目標放在轉粉，文案結尾加入追蹤理由與系列內容預告。" : "下一篇目標放在放大觸及，加入分享型 CTA 與社群討論題。" },
      ],
    };
    render();
  }
  if (action === "generate-ai-post-analysis") {
    generateAIAnalysis();
  }
  if (action === "generate-comment-question") {
    if (!postAnalysisResult) return;
    const title = postAnalysisResult.data.title;
    postAnalysisOutput = {
      title: "留言互動題",
      items: [
        { title: "二選一", text: `看完「${title}」，你比較想知道角色背景還是劇情伏筆？留言選一個。` },
        { title: "開放問答", text: "如果只能用一句話推薦這部電影，你會怎麼說？" },
        { title: "情緒投票", text: "這篇內容給你的第一感覺是期待、好奇，還是想立刻揪朋友？" },
      ],
    };
    render();
  }
  if (action === "generate-cta-copy") {
    if (!postAnalysisResult) return;
    const { metrics } = postAnalysisResult;
    postAnalysisOutput = {
      title: "CTA 文案",
      items: [
        { title: "追蹤導向", text: metrics.followerConversionRate < 0.01 ? "想看更多幕後解析與上映提醒，先追蹤起來，下一篇直接帶你看重點。" : "已經開始期待了嗎？追蹤我們，不錯過下一波角色與劇情線索。" },
        { title: "留言導向", text: "留言告訴我們你最想看哪一段，我們整理下一篇給你。" },
        { title: "點擊導向", text: metrics.clickRate < 0.005 ? "完整預告與上映資訊已整理好，點連結一次看完。" : "想知道更多上映資訊，點連結看完整內容。" },
      ],
    };
    render();
  }
  if (action === "generate-review-report") {
    if (!postAnalysisResult) return;
    const { data, metrics, labels } = postAnalysisResult;
    postAnalysisOutput = {
      title: "檢討報告",
      items: [
        { title: "內容類型", text: labels.join("、") },
        { title: "主要問題", text: metrics.engagementRate < 0.03 ? "互動率偏低，建議調整開頭鉤子與互動 CTA。" : metrics.followerConversionRate < 0.01 ? "互動已有基礎，但轉粉不足，建議補強追蹤理由。" : "整體表現可延伸，建議測試不同素材版本。" },
        { title: "下一步", text: `針對「${data.title}」保留表現好的元素，下一篇測試更明確的留言題或購票/預告導流。` },
      ],
    };
    render();
  }
  if (action === "export-analysis-summary") {
    if (!postAnalysisResult) return;
    const { data, metrics, labels, report } = postAnalysisResult;
    const summary = [
      `電影：${movieName(data.movieId)}`,
      `平台：${data.platform}`,
      `貼文：${data.title}`,
      `類型：${labels.join("、")}`,
      `總互動：${formatNumber(metrics.totalEngagements)}`,
      `互動率：${percent(metrics.engagementRate)}`,
      `追蹤轉換率：${percent(metrics.followerConversionRate)}`,
      `點擊率：${percent(metrics.clickRate)}`,
      `下一篇建議：${report.nextSteps.join(" / ")}`,
    ].join("\n");
    navigator.clipboard?.writeText(summary);
    postAnalysisOutput = { title: "匯出分析摘要", items: [{ title: "已複製摘要", text: summary }] };
    render();
  }
  if (action === "save-post-analysis") {
    if (!postAnalysisResult) return;
    savedPostAnalyses.unshift({ id: `post-analysis-${Date.now()}`, movieId: postAnalysisResult.data.movieId || selectedAnalyticsMovieId || "", ...postAnalysisResult });
    writeStorage(storageKeys.postAnalyses, savedPostAnalyses);
    postAnalysisOutput = { title: "儲存分析", items: [{ title: "已儲存", text: `「${postAnalysisResult.data.title}」已儲存到目前電影的分析資料，共 ${postAnalysesForSelectedMovie().length} 筆。` }] };
    render();
  }
  if (action === "generate-copy-preview") {
    generateCopyPreview();
  }
  if (action === "open-style-example-modal") {
    isStyleExampleModalOpen = true;
    editingStyleExampleId = null;
    styleExamplesError = "";
    styleExamplesNotice = "";
    render();
  }
  if (action === "edit-style-example") {
    editingStyleExampleId = actionElement.dataset.styleId;
    isStyleExampleModalOpen = true;
    styleExamplesError = "";
    styleExamplesNotice = "";
    render();
  }
  if (action === "close-style-example-modal") {
    isStyleExampleModalOpen = false;
    editingStyleExampleId = null;
    isStyleExampleSaving = false;
    render();
  }
  if (action === "delete-style-example") {
    if (!window.confirm("確定要刪除這筆 AI 風格範例嗎？")) return;
    try {
      await deleteStyleExampleFromServer(actionElement.dataset.styleId);
      styleExamplesError = "";
      styleExamplesNotice = "已刪除。";
      render();
    } catch (error) {
      styleExamplesError = error.message || "AI 風格範例刪除失敗。";
      styleExamplesNotice = "";
      render();
    }
  }
  if (action === "copy-style-example") {
    const example = mockData.aiStyleExamples.find((item) => String(item.id) === String(actionElement.dataset.styleId));
    if (example) {
      navigator.clipboard?.writeText(example.exampleContent || "");
      window.alert("範例內容已複製。");
    }
  }
  if (action === "use-style-example") {
    const example = mockData.aiStyleExamples.find((item) => String(item.id) === String(actionElement.dataset.styleId));
    if (example) {
      copyFocusValue = [
        example.useCase ? `任務：${example.useCase}` : "",
        example.aiInstruction ? `AI 使用提示：${example.aiInstruction}` : "",
        example.usageNote ? `使用建議：${example.usageNote}` : "",
        `請參考這則範例的語氣與邏輯：${example.exampleContent || ""}`,
      ].filter(Boolean).join("\n");
      localStorage.setItem(storageKeys.copyFocus, copyFocusValue);
      generatedCopyResult = null;
      copyGeneratorError = "";
      location.hash = "copy";
      render();
    }
  }
  if (action === "open-question-modal") {
    isQuestionModalOpen = true;
    editingQuestionId = null;
    render();
  }
  if (action === "close-question-modal") {
    isQuestionModalOpen = false;
    editingQuestionId = null;
    render();
  }
  if (action === "edit-question") {
    editingQuestionId = actionElement.dataset.questionId;
    isQuestionModalOpen = true;
    render();
  }
  if (action === "delete-question") {
    if (!window.confirm("確定要刪除這筆題目嗎？")) return;
    mockData.questions = mockData.questions.filter((question) => question.id !== actionElement.dataset.questionId);
    writeStorage(storageKeys.questions, mockData.questions);
    render();
  }
  if (action === "copy-question") {
    const question = mockData.questions.find((item) => item.id === actionElement.dataset.questionId);
    if (question) {
      navigator.clipboard?.writeText(question.content);
      window.alert("題目已複製。");
    }
  }
  if (action === "mark-question-used") {
    const question = mockData.questions.find((item) => item.id === actionElement.dataset.questionId);
    if (question) {
      if (question.status === "已使用") {
        question.uses = Math.max(0, Number(question.uses || 0) - 1);
        question.lastUsed = "";
        question.status = "可使用";
      } else {
        question.uses = Number(question.uses || 0) + 1;
        question.lastUsed = formatWeekDate(new Date());
        question.status = "已使用";
      }
      writeStorage(storageKeys.questions, mockData.questions);
      render();
    }
  }
  if (action === "mark-question-high") {
    const question = mockData.questions.find((item) => item.id === actionElement.dataset.questionId);
    if (question) {
      question.performance = "高";
      writeStorage(storageKeys.questions, mockData.questions);
      render();
    }
  }
  if (action === "schedule-question") {
    schedulingQuestionId = actionElement.dataset.questionId;
    isQuestionScheduleModalOpen = true;
    render();
  }
  if (action === "close-question-schedule-modal") {
    isQuestionScheduleModalOpen = false;
    schedulingQuestionId = null;
    render();
  }
  if (action === "ai-generate-questions") {
    generateQuestionBatch();
  }
  if (action === "rewrite-question" || action === "similar-question") {
    const question = mockData.questions.find((item) => item.id === actionElement.dataset.questionId);
    if (!question) return;
    generateQuestionAiResult(question, action === "rewrite-question" ? "rewrite" : "similar");
  }
  if (action === "open-metric-modal") {
    isMetricModalOpen = true;
    editingMetricPlatform = null;
    render();
  }
  if (action === "edit-metric") {
    editingMetricPlatform = actionElement.dataset.platform;
    isMetricModalOpen = true;
    render();
  }
  if (action === "close-metric-modal") {
    isMetricModalOpen = false;
    editingMetricPlatform = null;
    render();
  }
  if (action === "delete-metric") {
    if (!window.confirm("確定要刪除這筆平台數據嗎？")) return;
    mockData.socialMetrics = mockData.socialMetrics.filter((item) => !(item.movieId === selectedAnalyticsMovieId && item.platform === actionElement.dataset.platform));
    writeStorage(storageKeys.metrics, mockData.socialMetrics);
    render();
  }
  if (action === "clear-analytics-report") {
    analyticsReport = null;
    render();
  }
});

document.addEventListener("submit", async (event) => {
  if (!["authForm", "movieForm", "assetForm", "scheduleForm", "activityForm", "styleExampleForm", "questionForm", "questionScheduleForm", "metricForm", "analyticsLinkForm", "manualAnalyticsForm", "postAnalysisForm"].includes(event.target.id)) return;
  event.preventDefault();
  const formData = new FormData(event.target);

  if (event.target.id === "authForm") {
    authError = "";
    isAuthSubmitting = true;
    render();
    try {
      await requestJson("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      isAuthenticated = true;
      isAuthSubmitting = false;
      render();
      loadWorkflowDataFromServer();
    } catch (error) {
      isAuthSubmitting = false;
      authError = error.message || "登入失敗，請確認帳號密碼。";
      render();
    }
    return;
  }

  if (event.target.id === "postAnalysisForm") {
    postAnalysisResult = calculatePostAnalysis(formData);
    postAnalysisOutput = null;
    aiPostAnalysisText = "";
    aiPostAnalysisError = "";
    upsertSocialMetric({
      movieId: postAnalysisResult.data.movieId,
      platform: postAnalysisResult.data.platform,
      impressions: postAnalysisResult.data.impressions,
      reach: postAnalysisResult.data.reach,
      views: postAnalysisResult.data.views,
      likes: postAnalysisResult.data.likes,
      comments: postAnalysisResult.data.comments,
      shares: postAnalysisResult.data.shares,
      saves: postAnalysisResult.data.saves,
      newFollowers: postAnalysisResult.data.newFollowers,
      linkClicks: postAnalysisResult.data.linkClicks,
    });
    render();
    return;
  }

  if (event.target.id === "activityForm") {
    const activityData = {
      movieId: formData.get("movieId") || mockData.movies[0]?.id || "",
      title: formData.get("title") || "未命名活動",
      location: formData.get("location") || "未指定地點",
      dateTime: formData.get("dateTime") || "",
      attendees: formData.get("attendees") || "未指定",
      note: formData.get("note") || "",
    };
    const editingActivity = mockData.activities.find((activity) => activity.id === editingActivityId);
    if (editingActivity) Object.assign(editingActivity, activityData);
    else mockData.activities.push({ id: `act-${Date.now()}`, ...activityData });
    writeStorage(storageKeys.activities, mockData.activities);
    isActivityModalOpen = false;
    editingActivityId = null;
    render();
    return;
  }

  if (event.target.id === "analyticsLinkForm") {
    analyticsError = "";
    const linkUrl = String(formData.get("url") || "").trim();
    try {
      const payload = await requestJson("/api/analyze-social-link", {
        method: "POST",
        body: JSON.stringify({ url: linkUrl }),
      });
      if (payload.mode === "manual") {
        analyticsError = payload.message || "目前使用手動數據分析模式，未串接外部社群數據服務。";
      } else {
        upsertSocialMetric({ ...payload.metric, movieId: selectedAnalyticsMovieId });
        analyticsReport = payload.report;
      }
    } catch (error) {
      analyticsError = error.message || "目前使用手動數據分析模式，未串接外部社群數據服務。";
    }
    render();
    return;
  }

  if (event.target.id === "manualAnalyticsForm") {
    analyticsError = "目前使用手動數據分析模式，未串接外部社群數據服務。";
    const importedMetrics = [0, 1, 2]
      .map((index) => {
        const url = String(formData.get(`url${index}`) || "").trim();
        const platformInput = String(formData.get(`platform${index}`) || "").trim();
        const metric = {
          movieId: selectedAnalyticsMovieId,
          url,
          platform: platformInput || detectPlatformFromUrl(url, `手動連結 ${index + 1}`),
          impressions: Number(formData.get(`impressions${index}`) || 0),
          views: Number(formData.get(`views${index}`) || 0),
          reach: Number(formData.get(`reach${index}`) || 0),
          likes: Number(formData.get(`likes${index}`) || 0),
          comments: Number(formData.get(`comments${index}`) || 0),
          shares: Number(formData.get(`shares${index}`) || 0),
          saves: Number(formData.get(`saves${index}`) || 0),
          newFollowers: Number(formData.get(`newFollowers${index}`) || 0),
          linkClicks: Number(formData.get(`linkClicks${index}`) || 0),
        };
        const hasData = metric.url || metric.impressions || metric.reach || metric.views || metric.likes || metric.comments || metric.shares || metric.saves || metric.newFollowers || metric.linkClicks;
        return hasData ? metric : null;
      })
      .filter(Boolean);

    importedMetrics.forEach(upsertSocialMetric);
    analyticsReport = importedMetrics.length
      ? buildManualAnalyticsReport(importedMetrics)
      : {
          source: "手動分析",
          highlights: [{ title: "尚未輸入資料", text: "0 筆" }],
          insights: ["請至少輸入一筆社群連結或數據，系統才會開始分析。"],
          actions: ["建議先輸入觸及、按讚、留言、分享、收藏、新增追蹤與連結點擊。"],
        };
    render();
    return;
  }

  if (event.target.id === "movieForm") {
    try {
      await saveMovieToServer(moviePayloadFromForm(formData));
      isMovieModalOpen = false;
      editingMovieId = null;
      moviesError = "";
      location.hash = "movies";
      render();
    } catch (error) {
      moviesError = error.message;
      render();
    }
    return;
  }

  if (event.target.id === "assetForm") {
    const assetData = {
      name: formData.get("name") || "未命名素材",
      assetType: formData.get("assetType") || "素材",
      suitablePlatforms: parseList(formData.get("suitablePlatforms")),
      spoilerLevel: formData.get("spoilerLevel") || "低",
      reviewStatus: formData.get("reviewStatus") || "待審核",
      linkUrl: formData.get("linkUrl") || "",
    };
    const editingAsset = mockData.assets.find((asset) => asset.id === editingAssetId);
    if (editingAsset) Object.assign(editingAsset, assetData);
    else mockData.assets.push({ id: `ast-${Date.now()}`, movieId: getSelectedAssetMovie()?.id || "", ...assetData, color: colors[mockData.assets.length % colors.length] });
    writeStorage(storageKeys.assets, mockData.assets);
    isAssetModalOpen = false;
    editingAssetId = null;
    render();
    return;
  }

  if (event.target.id === "styleExampleForm") {
    if (isStyleExampleSaving) return;
    isStyleExampleSaving = true;
    styleExamplesError = "";
    styleExamplesNotice = "";
    render();
    try {
      await saveStyleExampleToServer(styleExamplePayloadFromForm(formData));
      isStyleExampleModalOpen = false;
      editingStyleExampleId = null;
      isStyleExampleSaving = false;
      styleExamplesError = "";
      styleExamplesNotice = "已儲存，畫面已更新。";
      render();
    } catch (error) {
      isStyleExampleSaving = false;
      styleExamplesError = error.message || "AI 風格範例儲存失敗。";
      styleExamplesNotice = "";
      render();
    }
    return;
  }

  if (event.target.id === "scheduleForm") {
    const scheduleData = {
      movieId: formData.get("movieId") || selectedScheduleMovieId || "",
      date: formatDateForDisplay(formData.get("date")),
      platform: formData.get("platform") || "Facebook",
      topic: formData.get("topic") || "未命名主題",
      copy: formData.get("copy") || "",
      assetId: formData.get("assetId") || "",
      assetLinkUrl: formData.get("assetLinkUrl") || assetLinkUrl(formData.get("assetId")) || "",
      status: formData.get("status") || "草稿",
      owner: formData.get("owner") || "未指定",
    };
    const editingSchedule = mockData.schedules.find((schedule) => schedule.id === editingScheduleId);
    if (editingSchedule) Object.assign(editingSchedule, scheduleData);
    else mockData.schedules.push({ id: `sch-${Date.now()}`, ...scheduleData });
    writeStorage(storageKeys.schedules, mockData.schedules);
    selectedScheduleMovieId = scheduleData.movieId;
    if (selectedScheduleMovieId) localStorage.setItem(storageKeys.scheduleMovie, selectedScheduleMovieId);
    const date = parseLocalDate(scheduleData.date);
    if (date) currentScheduleWeekStart = startOfWeek(date);
    isScheduleModalOpen = false;
    editingScheduleId = null;
    render();
  }
  if (event.target.id === "questionForm") {
    const selectedQuestionMovieId = String(formData.get("movieId") || "");
    const questionData = {
      content: formData.get("content") || "未命名題目",
      movieId: mockData.movies.some((movie) => String(movie.id) === selectedQuestionMovieId) ? selectedQuestionMovieId : "",
      type: formData.get("type") || "開放問答",
      platform: formData.get("platform") || "IG 限動",
      tone: formData.get("tone") || "親切",
      phase: formData.get("phase") || "預告上線",
      status: formData.get("status") || "可使用",
      cta: formData.get("cta") || "",
      asset: formData.get("asset") || "",
      note: formData.get("note") || "",
    };
    const editingQuestion = mockData.questions.find((question) => question.id === editingQuestionId);
    if (editingQuestion) Object.assign(editingQuestion, questionData);
    else mockData.questions.push({ id: `q-${Date.now()}`, ...questionData, uses: 0, lastUsed: "", performance: "未測試", createdAt: formatWeekDate(new Date()) });
    writeStorage(storageKeys.questions, mockData.questions);
    isQuestionModalOpen = false;
    editingQuestionId = null;
    render();
  }
  if (event.target.id === "questionScheduleForm") {
    const question = mockData.questions.find((item) => item.id === schedulingQuestionId);
    const scheduleData = {
      id: `sch-${Date.now()}`,
      movieId: question?.movieId || selectedScheduleMovieId || "",
      date: formatDateForDisplay(formData.get("date")),
      platform: formData.get("platform") || "Facebook",
      topic: question ? `互動題：${question.content.slice(0, 18)}` : "互動題",
      copy: formData.get("copy") || question?.content || "",
      assetId: "",
      status: formData.get("status") || "草稿",
      owner: formData.get("owner") || "社群小編",
    };
    mockData.schedules.push(scheduleData);
    if (question) {
      question.status = "已排程";
      question.uses += 1;
      question.lastUsed = scheduleData.date;
    }
    writeStorage(storageKeys.schedules, mockData.schedules);
    writeStorage(storageKeys.questions, mockData.questions);
    const date = parseLocalDate(scheduleData.date);
    if (date) currentScheduleWeekStart = startOfWeek(date);
    isQuestionScheduleModalOpen = false;
    schedulingQuestionId = null;
    render();
  }
  if (event.target.id === "metricForm") {
    const metricData = {
      movieId: formData.get("movieId") || selectedAnalyticsMovieId || "",
      platform: String(formData.get("platform") || "未命名平台").trim(),
      impressions: Number(formData.get("impressions") || 0),
      reach: Number(formData.get("reach") || 0),
      views: Number(formData.get("views") || 0),
      likes: Number(formData.get("likes") || 0),
      comments: Number(formData.get("comments") || 0),
      shares: Number(formData.get("shares") || 0),
      saves: Number(formData.get("saves") || 0),
      newFollowers: Number(formData.get("newFollowers") || 0),
      linkClicks: Number(formData.get("linkClicks") || 0),
    };
    const editingMetric = mockData.socialMetrics.find((item) => item.movieId === metricData.movieId && item.platform === editingMetricPlatform);
    if (editingMetric) Object.assign(editingMetric, metricData);
    else mockData.socialMetrics.push(metricData);
    writeStorage(storageKeys.metrics, mockData.socialMetrics);
    isMetricModalOpen = false;
    editingMetricPlatform = null;
    analyticsReport = buildAnalyticsReportFromUrl("");
    render();
  }
});

mockData.movies = readStorage(storageKeys.movies, mockData.movies);
mockData.assets = readStorage(storageKeys.assets, mockData.assets);
mockData.schedules = readStorage(storageKeys.schedules, mockData.schedules);
mockData.activities = readStorage(storageKeys.activities, mockData.activities);
mockData.questions = readStorage(storageKeys.questions, mockData.questions);
mockData.socialMetrics = readStorage(storageKeys.metrics, mockData.socialMetrics);
savedPostAnalyses = readStorage(storageKeys.postAnalyses, savedPostAnalyses);
mockData.aiStyleExamples = readStorage(storageKeys.styleExamples, mockData.aiStyleExamples);
movieReleaseStatusOverrides = readStorage(storageKeys.movieReleaseStatuses, movieReleaseStatusOverrides);
render();
checkAuthStatus();



