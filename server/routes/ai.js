const OpenAI = require("openai");

function numeric(value) {
  return Number(value || 0);
}

function buildAnalyzePostPrompt(data) {
  return `
你是一位有 20 年經驗的電影社群行銷總監，請根據以下單篇貼文數據，產出一份給社群小編使用的分析報告。

請使用繁體中文。
語氣要專業但白話，不要太 AI。
請不要只重複數字，要解釋「這些數字代表什麼」。

電影名稱：${data.movieTitle || "未提供"}
平台：${data.platform || "未提供"}
貼文連結：${data.postUrl || "未提供"}
貼文標題：${data.title || "未提供"}
貼文類型：${data.postType || "未提供"}
宣傳階段：${data.campaignStage || "未提供"}

數據：
曝光數：${numeric(data.impressions)}
觸及數：${numeric(data.reach)}
觀看數：${numeric(data.views)}
按讚數：${numeric(data.likes)}
留言數：${numeric(data.comments)}
分享數：${numeric(data.shares)}
收藏數：${numeric(data.saves)}
新增追蹤數：${numeric(data.newFollowers)}
連結點擊數：${numeric(data.linkClicks)}

系統已計算指標：
總互動數：${numeric(data.totalEngagements)}
互動率：${numeric(data.engagementRate)}%
分享率：${numeric(data.shareRate)}%
收藏率：${numeric(data.saveRate)}%
留言率：${numeric(data.commentRate)}%
追蹤轉換率：${numeric(data.followerConversionRate)}%
點擊率：${numeric(data.clickRate)}%

請依照以下格式輸出：

一、整體判斷
請用 2 到 3 句話說明這篇貼文屬於哪一種類型，例如：
高互動低轉粉型、高觸及低互動型、高分享擴散型、高收藏保存型、高價值轉換型、表現普通需優化型。

二、數據解讀
請解釋這篇貼文的觸及、互動、分享、收藏、轉粉表現各代表什麼。

三、可能問題
請列出 3 點這篇貼文可能遇到的問題。

四、下一篇貼文建議
請給 3 到 5 點具體建議，適合電影社群小編直接拿去操作。

五、可直接使用的 CTA 文案
請給 5 句短 CTA，適合放在 IG / FB / Threads。
`.trim();
}

async function analyzePost(request, response, helpers) {
  const { readJsonBody, sendJson, envValue } = helpers;
  const apiKey = envValue("OPENAI_API_KEY");

  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  let data;
  try {
    data = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Request body 格式錯誤。" });
    return;
  }

  try {
    const OpenAIClient = OpenAI.default || OpenAI;
    const openai = new OpenAIClient({ apiKey });
    const result = await openai.responses.create({
      model: envValue("OPENAI_ANALYSIS_MODEL") || "gpt-5.5",
      input: buildAnalyzePostPrompt(data || {}),
    });

    sendJson(response, 200, {
      analysis: result.output_text || "AI 沒有回傳分析內容，請重新產生一次。",
    });
  } catch (error) {
    console.error("OpenAI analyze-post error");
    sendJson(response, 500, {
      error: "AI 分析產生失敗，請稍後再試。",
    });
  }
}

module.exports = {
  analyzePost,
};
