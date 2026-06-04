const OpenAI = require("openai");

const MOVIE_EDITOR_SYSTEM_PROMPT = `
你是一位有 20 年經驗的電影社群行銷小編與行銷企劃。

語言要求：
- 只能使用繁體中文。
- 不要使用簡體中文。

語氣要求：
- 自然、有社群感、白話、短句、有小編感。
- 不要太像新聞稿，也不要太 AI。

專業能力：
- 電影宣傳文案
- IG / FB / Threads / YouTube Shorts 文案
- 留言回覆
- 負評處理
- 互動題產生
- CTA 產生
- 社群數據分析
- 宣傳節奏建議
- 依照上映前、上映中、下檔前、口碑期調整文案

禁止事項：
- 不要爆雷。
- 不要捏造未提供的劇情。
- 不要使用簡體中文。
- 不要過度官方。
- 不要一直寫「感謝支持」。
- 不要攻擊觀眾。
- 不要保證票房或成效。
- 不要洩漏內部資料。
`.trim();

function getOpenAIClient(apiKey) {
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }
  const OpenAIClient = OpenAI.default || OpenAI;
  return new OpenAIClient({ apiKey });
}

function formatList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("、") || "未提供";
  return String(value || "").trim() || "未提供";
}

function buildMovieContext(movie = {}) {
  return [
    "目前電影資料：",
    `電影名稱：${movie.title || movie.name || movie.movieTitle || "未提供"}`,
    `電影類型：${movie.genre || movie.movieGenre || "未提供"}`,
    `上映日期：${movie.releaseDate || movie.release_date || "未提供"}`,
    `宣傳階段：${movie.campaignStage || movie.phase || movie.releaseStatus || "未提供"}`,
    `核心賣點：${formatList(movie.coreSellingPoints || movie.core_selling_points)}`,
    `角色名稱：${formatList(movie.characters || movie.characterNames)}`,
    `禁止爆雷內容：${formatList(movie.spoilerRestrictions || movie.noSpoilers)}`,
    `常用標語：${formatList(movie.taglines || movie.slogans)}`,
    `社群語氣：${movie.socialTone || movie.tone || "未提供"}`,
  ].join("\n");
}

function exampleValue(example, camelKey, snakeKey) {
  return example?.[camelKey] || example?.[snakeKey] || "";
}

function buildStyleExamplesBlock(styleExamples = []) {
  if (!Array.isArray(styleExamples) || !styleExamples.length) return "";
  return [
    "可參考的 AI 風格範例：",
    ...styleExamples.slice(0, 8).map((example, index) => [
      `範例 ${index + 1}`,
      `類型：${exampleValue(example, "type", "type") || "未提供"}`,
      `平台：${exampleValue(example, "platform", "platform") || "未提供"}`,
      `電影類型：${exampleValue(example, "movieGenre", "movie_genre") || "未提供"}`,
      `宣傳情境：${exampleValue(example, "campaignStage", "campaign_stage") || "未提供"}`,
      `語氣：${exampleValue(example, "tone", "tone") || "未提供"}`,
      `範例內容：${exampleValue(example, "exampleContent", "example_content") || "未提供"}`,
      `為什麼這則好：${exampleValue(example, "whyItWorks", "why_it_works") || "未提供"}`,
      `使用建議：${exampleValue(example, "usageNote", "usage_note") || "未提供"}`,
      `品質標籤：${formatList(exampleValue(example, "qualityTags", "quality_tags"))}`,
      `適用任務：${exampleValue(example, "useCase", "use_case") || "未提供"}`,
      `推薦分數：${exampleValue(example, "score", "score") || 3}/5`,
      `AI 使用提示：${exampleValue(example, "aiInstruction", "ai_instruction") || "未提供"}`,
    ].join("\n")),
    "請只模仿以上範例的語氣、節奏、回覆策略與判斷邏輯，不要直接複製範例原文。每次都要產生新的內容。",
  ].join("\n\n");
}

function buildTaskInput({ taskName, movie, brief, data, styleExamples }) {
  return [
    buildMovieContext(movie),
    buildStyleExamplesBlock(styleExamples),
    `任務：${taskName}`,
    `任務說明：${brief || "請依照電影資料與需求產生內容。"}`,
    data ? `使用者輸入資料：\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}` : "",
  ].filter(Boolean).join("\n\n");
}

async function runMovieEditorTask({ apiKey, model, taskName, movie, brief, data, styleExamples }) {
  const openai = getOpenAIClient(apiKey);
  const response = await openai.responses.create({
    model: model || "gpt-4.1-mini",
    instructions: MOVIE_EDITOR_SYSTEM_PROMPT,
    input: buildTaskInput({ taskName, movie, brief, data, styleExamples }),
  });
  return response.output_text || "";
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function generateSocialPost(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生電影社群貼文",
    brief: options.brief || "請產生適合社群使用的電影宣傳文案，角度要有小編感、自然、不劇透。",
  });
}

async function generateCommentReply(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生小編留言回覆",
    brief: options.brief || [
      "請產生適合小編使用的留言回覆。",
      "請根據使用者留言、平台、電影類型與宣傳情境回覆。",
      "若有風格範例，請模仿語氣、節奏與回覆策略，但不要直接複製範例原文。",
      "回覆要自然、有社群感、短句、適合直接貼出。",
      "不要爆雷，不要攻擊觀眾，不要過度官方。",
    ].join("\n"),
  });
}

async function generateQuestionIdeas(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生互動問答題",
    brief: options.brief || "請產生適合 IG 限動、Threads、Facebook 或 Reels 使用的互動題，不劇透、可引導留言或投票。",
  });
}

async function generateCTA(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生 CTA 文案",
    brief: options.brief || "請產生短 CTA，適合 IG、Facebook、Threads 使用，語氣自然，不要過度銷售。",
  });
}

async function analyzePostData(options) {
  const data = options.data || {};
  const metricsSummary = [
    `平台：${data.platform || "未提供"}`,
    `貼文標題：${data.title || "未提供"}`,
    `貼文類型：${data.postType || "未提供"}`,
    `宣傳階段：${data.campaignStage || "未提供"}`,
    `曝光數：${Number(data.impressions || 0)}`,
    `觸及數：${Number(data.reach || 0)}`,
    `觀看數：${Number(data.views || 0)}`,
    `按讚數：${Number(data.likes || 0)}`,
    `留言數：${Number(data.comments || 0)}`,
    `分享數：${Number(data.shares || 0)}`,
    `收藏數：${Number(data.saves || 0)}`,
    `新增追蹤數：${Number(data.newFollowers || 0)}`,
    `連結點擊數：${Number(data.linkClicks || 0)}`,
    `總互動數：${Number(data.totalEngagements || 0)}`,
    `互動率：${percent(data.engagementRate)}`,
    `分享率：${percent(data.shareRate)}`,
    `收藏率：${percent(data.saveRate)}`,
    `留言率：${percent(data.commentRate)}`,
    `追蹤轉換率：${percent(data.followerConversionRate)}`,
    `點擊率：${percent(data.clickRate)}`,
  ].join("\n");

  return runMovieEditorTask({
    ...options,
    taskName: "分析單篇貼文數據",
    brief: options.brief || [
      "請產生給電影社群小編看的分析報告。",
      "不要只重複數字，要說明數字代表什麼。",
      "請包含整體判斷、數據解讀、可能問題、下一篇建議與 CTA 建議。",
    ].join("\n"),
    data: metricsSummary,
  });
}

async function generateCampaignSuggestions(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生宣傳建議",
    brief: options.brief || "請根據電影資料與目前宣傳階段，提出下一步社群宣傳建議。",
  });
}

module.exports = {
  MOVIE_EDITOR_SYSTEM_PROMPT,
  buildMovieContext,
  generateSocialPost,
  generateCommentReply,
  generateQuestionIdeas,
  generateCTA,
  analyzePostData,
  generateCampaignSuggestions,
};
