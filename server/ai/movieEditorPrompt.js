const OpenAI = require("openai");

const MOVIE_EDITOR_SYSTEM_PROMPT = `
你是一位有 20 年經驗的電影社群行銷小編與行銷企劃。

語言要求：
- 只能使用繁體中文。
- 不要使用簡體中文。

語氣要求：
- 自然、有社群感、白話、短句、有小編感。
- 不要太像新聞稿。
- 不要太 AI。
- 可以有情緒與節奏，但不要浮誇。

專業能力：
- 電影宣傳文案
- Instagram、Facebook、Threads、YouTube Shorts 文案
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

工作原則：
- 若資料不足，請保守處理，不要自行補劇情。
- 若需要使用角色、劇情、口碑或數據，必須以使用者提供的資料為準。
- 每次輸出都要讓電影社群小編可以直接拿去使用或微調。
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
    `類型：${movie.genre || movie.movieGenre || "未提供"}`,
    `上映日期：${movie.releaseDate || movie.release_date || "未提供"}`,
    `宣傳階段：${movie.campaignStage || movie.phase || movie.releaseStatus || "未提供"}`,
    `核心賣點：${formatList(movie.coreSellingPoints || movie.core_selling_points)}`,
    `角色名稱：${formatList(movie.characters || movie.characterNames)}`,
    `禁止爆雷內容：${formatList(movie.spoilerRestrictions || movie.noSpoilers)}`,
    `常用標語：${formatList(movie.taglines || movie.slogans)}`,
    `社群語氣：${movie.socialTone || movie.tone || "未提供"}`,
  ].join("\n");
}

function buildStyleExamplesBlock(styleExamples = []) {
  if (!Array.isArray(styleExamples) || !styleExamples.length) return "";
  return [
    "可參考的風格範例：",
    ...styleExamples.slice(0, 5).map((example, index) => [
      `範例 ${index + 1}`,
      `類型：${example.type || "未提供"}`,
      `平台：${example.platform || "未提供"}`,
      `電影類型：${example.movieGenre || example.movie_genre || "未提供"}`,
      `宣傳情境：${example.campaignStage || example.campaign_stage || "未提供"}`,
      `語氣：${example.tone || "未提供"}`,
      `範例內容：${example.exampleContent || example.example_content || "未提供"}`,
      `為什麼這則好：${example.whyItWorks || example.why_it_works || "未提供"}`,
      `使用建議：${example.usageNote || example.usage_note || "未提供"}`,
      `品質標籤：${Array.isArray(example.qualityTags || example.quality_tags) ? (example.qualityTags || example.quality_tags).join("、") : "未提供"}`,
      `適用任務：${example.useCase || example.use_case || "未提供"}`,
      `推薦分數：${example.score || 3}/5`,
      `AI 使用提示：${example.aiInstruction || example.ai_instruction || "未提供"}`,
    ].join("\n")),
    "請參考以上範例的語氣、節奏與操作邏輯，但不要逐字照抄。",
  ].join("\n\n");
}

function buildTaskInput({ taskName, movie, brief, data, styleExamples }) {
  return [
    buildMovieContext(movie),
    buildStyleExamplesBlock(styleExamples),
    `任務：${taskName}`,
    `需求：${brief || "請依照電影資料完成任務。"}`,
    data ? `補充資料：\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}` : "",
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
    taskName: "產生社群貼文",
    brief: options.brief || "請依平台產生可直接發布的電影社群貼文，避免爆雷，並保留社群感。",
  });
}

async function generateCommentReply(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生留言回覆",
    brief: options.brief || "請依留言情境產生自然回覆。若是負評，請冷靜、尊重、不攻擊觀眾。",
  });
}

async function generateQuestionIdeas(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生互動問答題",
    brief: options.brief || "請產生適合 IG 限動、Threads、Facebook 或 Reels 使用的互動題。",
  });
}

async function generateCTA(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生 CTA 文案",
    brief: options.brief || "請產生短句 CTA，適合放在 IG、Facebook、Threads 或短影音結尾。",
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
      "請產出電影社群小編看得懂的數據分析報告。",
      "格式包含：一、整體判斷；二、數據解讀；三、可能問題；四、下一篇貼文建議；五、可直接使用的 CTA 文案。",
      "不要只重複數字，請解釋這些數字代表什麼。",
    ].join("\n"),
    data: metricsSummary,
  });
}

async function generateCampaignSuggestions(options) {
  return runMovieEditorTask({
    ...options,
    taskName: "產生宣傳節奏建議",
    brief: options.brief || "請依上映前、上映中、下檔前或口碑期，提出下一波社群宣傳節奏與內容方向。",
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
