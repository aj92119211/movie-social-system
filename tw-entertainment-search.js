const rangeLabels = { today: "今天", "7d": "最近 7 天", "30d": "最近 30 天", year: "今年" };
const sortLabels = { latest: "最新優先", relevance: "相關度優先", source: "來源分類", title: "作品名稱" };
const depthLabels = { quick: "快速搜尋", standard: "標準搜尋", deep: "深度搜尋" };
const keywordInput = document.getElementById("keywordInput");
const searchButton = document.getElementById("searchButton");
const depthSelect = document.getElementById("depthSelect");
const rangeSelect = document.getElementById("rangeSelect");
const sortSelect = document.getElementById("sortSelect");
const includeTrackedKeywords = document.getElementById("includeTrackedKeywords");
const autoExpandRange = document.getElementById("autoExpandRange");
const excludeRecentlySeen = document.getElementById("excludeRecentlySeen");
const socialSourceToggles = [...document.querySelectorAll(".social-source-toggle")];
const statusBox = document.getElementById("searchStatus");
const toast = document.getElementById("toast");
const copyDigestButton = document.getElementById("copyDigestButton");
const quickButtons = [...document.querySelectorAll("[data-query]")];
const trackedKeywordInput = document.getElementById("trackedKeywordInput");
const addTrackedKeywordButton = document.getElementById("addTrackedKeywordButton");
const trackedKeywordList = document.getElementById("trackedKeywordList");
const trackedKeywordStorageKey = "twEntertainmentTrackedKeywords";
const defaultTrackedKeywords = ["不算AI情", "打狗", "哥哥可以跟我打勾勾嗎", "絕勝", "寶島西米樂", "我們與惡的距離II", "便利商店"];
let trackedKeywords = loadTrackedKeywords();
let lastSearchPayload = null;
let manualKeywordEdited = false;

function selectedSocialPlatforms() {
  return socialSourceToggles.filter((item) => item.checked).map((item) => item.value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tagList(tags = [], className = "") {
  return tags.map((tag) => `<span class="tag ${className}">${escapeHtml(tag)}</span>`).join("");
}

function showStatus(message, type = "notice") {
  statusBox.className = type === "error" ? "status red" : type === "success" ? "status green" : type === "warning" ? "status amber" : "notice";
  statusBox.textContent = message;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1400);
}

function loadTrackedKeywords() {
  try {
    const stored = JSON.parse(localStorage.getItem(trackedKeywordStorageKey) || "null");
    if (Array.isArray(stored)) return stored.filter(Boolean);
  } catch {
    // Use defaults when localStorage is unavailable or corrupted.
  }
  return [...defaultTrackedKeywords];
}

function saveTrackedKeywords() {
  localStorage.setItem(trackedKeywordStorageKey, JSON.stringify(trackedKeywords));
}

function renderTrackedKeywords() {
  trackedKeywordList.innerHTML = trackedKeywords.length
    ? trackedKeywords.map((keyword) => `
        <span class="tracker-tag">
          ${escapeHtml(keyword)}
          <button type="button" data-remove-tracked="${escapeHtml(keyword)}" aria-label="移除 ${escapeHtml(keyword)}">×</button>
        </span>
      `).join("")
    : `<span class="muted">目前沒有追蹤關鍵字。</span>`;
}

function addTrackedKeyword() {
  const keyword = trackedKeywordInput.value.trim();
  if (!keyword) {
    showStatus("請先輸入要追蹤的作品、人名或公司名。", "warning");
    return;
  }
  if (!trackedKeywords.includes(keyword)) trackedKeywords = [...trackedKeywords, keyword];
  trackedKeywordInput.value = "";
  saveTrackedKeywords();
  renderTrackedKeywords();
  showStatus(`已加入追蹤關鍵字：${keyword}`);
}

function resultActions(item, linkLabel) {
  const url = item.resultType === "social" ? item.postUrl : item.articleUrl;
  const text = item.title || item.relatedTitle || "";
  return `
    <div class="actions">
      ${url ? `<a class="secondary-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>` : ""}
      <button class="secondary-button" type="button" data-copy="${escapeHtml(text)}">複製標題</button>
    </div>
  `;
}

function getItemUrl(item) {
  return item?.resultType === "social" ? item.postUrl : item.articleUrl;
}

function buildDigestSection(title, items = []) {
  if (!items.length) return `${title}\n目前沒有資料`;
  const rows = items.slice(0, 20).map((item, index) => {
    const label = item.sourceName || item.platform || "未提供來源";
    const date = item.publishedDate || "未提供日期";
    const tags = Array.isArray(item.tags) && item.tags.length ? `｜${item.tags.join(" ")}` : "";
    const url = getItemUrl(item) || "";
    return `${index + 1}. ${item.title || item.relatedTitle || "未命名"}｜${label}｜${date}${tags}${url ? `\n${url}` : ""}`;
  });
  return `${title}\n${rows.join("\n")}`;
}

function buildDailyDigest() {
  if (!lastSearchPayload?.summary) return "";
  const summary = lastSearchPayload.summary;
  const date = summary.searchedAt ? new Date(summary.searchedAt).toLocaleString("zh-TW") : new Date().toLocaleString("zh-TW");
  const header = [
    `台灣影視圈每日快搜｜${date}`,
    `關鍵字：${summary.keyword || "-"}`,
    `追蹤關鍵字：${(summary.trackedKeywords || []).join("、") || "無"}`,
    `時間範圍：${rangeLabels[summary.range] || summary.range || "-"}`,
    `新聞與官方來源：${summary.newsCount || 0} 筆`,
    `相關報導：${summary.relatedNewsCount || 0} 筆`,
    `社群與討論入口：${summary.socialCount || 0} 筆`,
  ].join("\n");
  return [
    header,
    buildDigestSection("一、產業新聞與官方來源", lastSearchPayload.newsResults || []),
    buildDigestSection("二、相關報導", lastSearchPayload.relatedNewsResults || []),
    buildDigestSection("三、社群與討論入口", lastSearchPayload.socialResults || []),
  ].join("\n\n");
}

function renderSummary(summary = {}) {
  const range = rangeLabels[summary.range] || rangeLabels[rangeSelect.value];
  const sort = sortLabels[summary.sort] || sortLabels[sortSelect.value];
  const depth = depthLabels[summary.depth] || depthLabels[depthSelect.value];
  const date = summary.searchedAt ? new Date(summary.searchedAt).toLocaleString("zh-TW") : "-";
  document.getElementById("summaryDescription").textContent = `搜尋關鍵字：${summary.keyword || "-"}｜搜尋深度：${depth}｜時間範圍：${range}｜排序：${sort}｜搜尋日期：${date}`;
  document.getElementById("summaryGrid").innerHTML = [
    ["原始結果", summary.rawCount || 0],
    ["去重後", summary.dedupedCount || 0],
    ["主新聞", summary.newsCount || 0],
    ["相關報導", summary.relatedNewsCount || 0],
    ["討論入口", summary.socialCount || 0],
    ["排除結果", summary.excludedCount || 0],
  ].map(([label, value]) => `<div class="summary-item"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const categoryText = Object.entries(summary.categoryCounts || {}).map(([key, value]) => `${key} ${value}`).join("、");
  const points = [...(summary.focusPoints || [])];
  if (categoryText) points.unshift(`主要分類統計：${categoryText}`);
  if (Array.isArray(summary.usedQueries) && summary.usedQueries.length) points.push(`使用搜尋關鍵字：${summary.usedQueries.slice(0, 12).join("、")}`);
  if (Array.isArray(summary.usedSources) && summary.usedSources.length) points.push(`加強來源：${summary.usedSources.slice(0, 12).join("、")}`);
  if (Array.isArray(summary.fallbackMessages) && summary.fallbackMessages.length) {
    for (const message of summary.fallbackMessages) points.push(message);
  }
  document.getElementById("searchFocusList").innerHTML = points.length ? points.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "";
}

function resultTotalCount(items = []) {
  return items.reduce((count, item) => count + 1 + (Array.isArray(item.relatedReports) ? item.relatedReports.length : 0), 0);
}

function relatedReportsHtml(item = {}) {
  const related = Array.isArray(item.relatedReports) ? item.relatedReports : [];
  if (!related.length) return "";
  return `
    <div class="related-reports">
      <div class="related-title">相關報導 ${related.length} 則</div>
      ${related.slice(0, 6).map((report) => {
        const url = report.articleUrl || report.postUrl || "";
        const source = report.sourceName || report.platform || "來源未提供";
        const date = report.publishedDate || "日期未提供";
        const title = report.title || url || "未命名報導";
        return `
          <div class="related-item">
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>` : `<span>${escapeHtml(title)}</span>`}
            <small>${escapeHtml(source)}｜${escapeHtml(date)}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderResultSection(containerId, countId, items = [], options = {}) {
  const {
    emptyText,
    linkLabel = "開啟原文",
    getTitle = (item) => item.title,
    getMeta = (item) => `來源：${escapeHtml(item.sourceName)}｜日期：${escapeHtml(item.publishedDate || "未提供")}`,
    getTags = (item) => item.tags,
  } = options;
  document.getElementById(countId).textContent = `${resultTotalCount(items)} 筆`;
  document.getElementById(containerId).innerHTML = items.length ? items.map((item) => `
    <article class="result-row">
      <div class="result-top">
        <div>
          <h3 class="result-title">${escapeHtml(getTitle(item))}</h3>
          <div class="meta">${getMeta(item)}</div>
        </div>
        <div class="tags">${tagList(getTags(item))}</div>
      </div>
      ${relatedReportsHtml(item)}
      ${resultActions(item, linkLabel)}
    </article>
  `).join("") : `<div class="empty">${emptyText}</div>`;
}

function renderNews(items = []) {
  renderResultSection("newsResults", "newsCount", items, {
    emptyText: "本次未找到相關新聞或官方來源。",
    linkLabel: "開啟原文",
  });
}

function renderRelatedNews(items = []) {
  renderResultSection("relatedNewsResults", "relatedNewsCount", items, {
    emptyText: "本次沒有額外相關報導。",
    linkLabel: "開啟原文",
    getTags: (item) => [...(item.tags || []), "相關報導"],
  });
}

function renderSocial(items = []) {
  renderResultSection("socialResults", "socialCount", items, {
    emptyText: "本次未找到相關社群或討論入口。",
    linkLabel: "開啟貼文",
    getTitle: (item) => item.relatedTitle || item.title,
    getMeta: (item) => `平台：${escapeHtml(item.platform)}｜帳號／看板：${escapeHtml(item.accountName || "-")}｜日期：${escapeHtml(item.publishedDate || "未提供")}`,
  });
}

async function performSearch(query) {
  const keyword = String(query || keywordInput.value || "").trim();
  if (!keyword) {
    showStatus("請先輸入搜尋關鍵字。", "warning");
    keywordInput.focus();
    return;
  }
  keywordInput.value = keyword;
  searchButton.textContent = "搜尋中...";
  searchButton.disabled = true;
  const selectedOptions = quickButtons.filter((item) => item.classList.contains("selected")).map((item) => item.dataset.query);
  const platforms = selectedSocialPlatforms();
  const useTrackedKeywords = includeTrackedKeywords.checked;
  console.log("[TW_SEARCH_UI_START]", {
    keyword,
    selectedOptions,
    includeTrackedKeywords: useTrackedKeywords,
    autoExpandRange: autoExpandRange.checked,
    excludeRecentlySeen: excludeRecentlySeen.checked,
    socialPlatforms: platforms,
    depth: depthSelect.value,
    range: rangeSelect.value,
    sort: sortSelect.value,
  });

  async function fetchWithUiTimeout(params, timeoutMs, label) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log("[TW_SEARCH_UI_QUERY]", { label, params: params.toString() });
      const response = await fetch(`/api/tw-entertainment-news/search?${params.toString()}`, { signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "搜尋失敗，請稍後再試。");
      return payload;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  showStatus("正在產生搜尋關鍵字...");
  try {
    const newsParams = new URLSearchParams({
      q: keyword,
      depth: depthSelect.value,
      range: rangeSelect.value,
      sort: sortSelect.value,
      includeSocial: "false",
      includeAi: "false",
      autoExpandRange: autoExpandRange.checked ? "true" : "false",
      excludeRecentlySeen: excludeRecentlySeen.checked ? "true" : "false",
      trackedKeywords: useTrackedKeywords ? trackedKeywords.join(",") : "",
    });
    showStatus("正在搜尋新聞與官方來源...");
    const payload = await fetchWithUiTimeout(newsParams, 60000, "news");
    showStatus("正在整理搜尋結果...");
    lastSearchPayload = payload;
    console.log("[TW_SEARCH_UI_RESULT]", {
      rawCount: payload.summary?.rawCount,
      dedupedCount: payload.summary?.dedupedCount,
      newsCount: payload.summary?.newsCount,
      relatedNewsCount: payload.summary?.relatedNewsCount,
      socialCount: payload.summary?.socialCount,
      excludedCount: payload.summary?.excludedCount,
      failedQueryCount: payload.summary?.failedQueryCount,
    });
    showStatus("正在去除重複結果並分類...");
    renderSummary(payload.summary);
    renderNews(payload.newsResults);
    renderRelatedNews(payload.relatedNewsResults || []);
    renderSocial([]);
    const limitationText = (payload.limitations || []).join(" ");
    const hasNewsResult = (payload.summary?.newsCount || 0) + (payload.summary?.relatedNewsCount || 0) > 0;
    if (platforms.length) {
      showStatus("已取得新聞結果，正在補充討論來源...");
      try {
        const socialParams = new URLSearchParams({
          q: keyword,
          depth: "quick",
          range: rangeSelect.value,
          sort: sortSelect.value,
          includeSocial: "true",
          onlySocial: "true",
          includeAi: "false",
          socialPlatforms: platforms.join(","),
        });
        const socialPayload = await fetchWithUiTimeout(socialParams, 20000, "social");
        payload.socialResults = socialPayload.socialResults || [];
        payload.summary.socialCount = socialPayload.summary?.socialCount || 0;
        payload.summary.partialFailure = Boolean(payload.summary.partialFailure || socialPayload.summary?.partialFailure);
        lastSearchPayload = payload;
        renderSummary(payload.summary);
        renderSocial(payload.socialResults);
      } catch (socialError) {
        console.warn("[TW_SEARCH_UI_SOCIAL_FAILED]", socialError);
        payload.summary.partialFailure = true;
        lastSearchPayload = payload;
        renderSummary(payload.summary);
        showStatus("討論來源部分逾時，已先顯示新聞與官方來源結果。", "warning");
        return;
      }
    }
    const hasAnyResult = (payload.summary?.newsCount || 0) + (payload.summary?.relatedNewsCount || 0) + (payload.summary?.socialCount || 0) > 0;
    if (!hasAnyResult) {
      const fallbackText = Array.isArray(payload.summary?.fallbackMessages) && payload.summary.fallbackMessages.length
        ? ` ${payload.summary.fallbackMessages.join(" ")}`
        : "";
      showStatus(`本次搜尋沒有取得結果。${fallbackText || "新聞來源沒有回傳結果，請檢查搜尋條件、來源設定或放寬時間範圍。"}`, "warning");
    } else if (payload.summary?.partialFailure) {
      showStatus(`部分來源搜尋逾時，已先顯示目前取得的結果。建議關閉討論來源，或改用快速搜尋。${limitationText}`, "warning");
    } else {
      showStatus(payload.summary?.aiFailed ? `搜尋完成，但 AI 整理使用保守備援。${limitationText}` : `搜尋完成。${limitationText}`, payload.summary?.aiFailed ? "warning" : "success");
    }
  } catch (error) {
    console.error("[TW_ENTERTAINMENT_SEARCH_UI_FAILED]", error);
    if (error.name === "AbortError") {
      showStatus("部分來源搜尋逾時，已先顯示目前取得的結果。建議關閉討論來源，或改用快速搜尋。", "warning");
    } else {
      showStatus(error.message.includes("登入") ? "請先回主系統登入後，再使用搜尋 API。" : error.message, "error");
    }
  } finally {
    console.log("[TW_SEARCH_UI_FINISH]", { keyword, loadingClosed: true });
    searchButton.textContent = "搜尋";
    searchButton.disabled = false;
  }
}

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    const selectedKeywords = quickButtons.filter((item) => item.classList.contains("selected")).map((item) => item.dataset.query);
    if (selectedKeywords.length || !manualKeywordEdited) {
      keywordInput.value = selectedKeywords.join(" ");
      manualKeywordEdited = false;
    }
    showStatus(selectedKeywords.length ? "已選擇搜尋關鍵字，請按「搜尋」開始查詢。" : "請輸入關鍵字，或複選上方搜尋選項後按「搜尋」。");
  });
});

searchButton.addEventListener("click", () => performSearch());
keywordInput.addEventListener("input", () => {
  manualKeywordEdited = true;
  quickButtons.forEach((button) => button.classList.remove("selected"));
});
keywordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") performSearch();
});

addTrackedKeywordButton.addEventListener("click", addTrackedKeyword);
trackedKeywordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTrackedKeyword();
});
trackedKeywordList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-tracked]");
  if (!removeButton) return;
  trackedKeywords = trackedKeywords.filter((keyword) => keyword !== removeButton.dataset.removeTracked);
  saveTrackedKeywords();
  renderTrackedKeywords();
  showStatus("已移除追蹤關鍵字。");
});

copyDigestButton.addEventListener("click", async () => {
  const digest = buildDailyDigest();
  if (!digest) {
    showStatus("請先搜尋，再複製今日整理。", "warning");
    return;
  }
  try {
    await navigator.clipboard.writeText(digest);
    showToast("已複製今日整理");
  } catch {
    window.alert("複製失敗，請手動選取文字。");
  }
});

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy]");
  if (!copyButton) return;
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copy);
    showToast("已複製標題");
  } catch {
    window.alert("複製失敗，請手動選取文字。");
  }
});

renderTrackedKeywords();
