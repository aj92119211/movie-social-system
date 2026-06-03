const {
  analyzePostData,
  generateSocialPost,
  generateCommentReply,
  generateQuestionIdeas,
  generateCTA,
  generateCampaignSuggestions,
} = require("../ai/movieEditorPrompt");

const movieEditorTasks = {
  "social-post": generateSocialPost,
  "comment-reply": generateCommentReply,
  "question-ideas": generateQuestionIdeas,
  cta: generateCTA,
  "analyze-post-data": analyzePostData,
  "campaign-suggestions": generateCampaignSuggestions,
};

function movieFromPostData(data) {
  return {
    title: data.movieTitle,
    genre: data.movieGenre,
    campaignStage: data.campaignStage,
    socialTone: data.socialTone,
    coreSellingPoints: data.coreSellingPoints,
    characters: data.characters,
    spoilerRestrictions: data.spoilerRestrictions,
    taglines: data.taglines,
  };
}

async function styleExamplesForTask(taskName, data, helpers) {
  if (!helpers.loadRelevantStyleExamples) return [];
  const typeMap = {
    "social-post": "貼文",
    "comment-reply": "留言回覆",
    "question-ideas": "互動題",
    cta: "CTA",
    "analyze-post-data": "數據分析",
    "campaign-suggestions": "宣傳建議",
  };
  return helpers.loadRelevantStyleExamples({
    type: typeMap[taskName] || "",
    platform: data.platform,
    movieGenre: data.movieGenre || data.genre,
    campaignStage: data.campaignStage,
    tone: data.tone || data.socialTone,
  });
}

async function runMovieEditorApi(request, response, helpers, taskName) {
  const { readJsonBody, sendJson, envValue } = helpers;
  const task = movieEditorTasks[taskName];
  if (!task) {
    sendJson(response, 404, { error: "找不到這個 AI 任務。" });
    return;
  }

  const apiKey = envValue("OPENAI_API_KEY");
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Request body 解析失敗。" });
    return;
  }

  const movie = body.movie || movieFromPostData(body);
  const data = body.data || body;

  try {
    const text = await task({
      apiKey,
      model: envValue("OPENAI_MODEL") || "gpt-4.1-mini",
      movie,
      data,
      brief: body.brief,
      styleExamples: await styleExamplesForTask(taskName, data, helpers),
    });
    sendJson(response, 200, { result: text, analysis: taskName === "analyze-post-data" ? text : undefined });
  } catch (error) {
    console.error("Movie editor AI error");
    sendJson(response, error.statusCode || 500, { error: "AI 產生失敗，請稍後再試。" });
  }
}

async function analyzePost(request, response, helpers) {
  runMovieEditorApi(request, response, helpers, "analyze-post-data");
}

module.exports = {
  analyzePost,
  runMovieEditorApi,
};
