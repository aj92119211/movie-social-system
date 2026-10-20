import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
export const CONFIG_PATH = path.join(ROOT, "config", "film-daily-sources.json");

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date") args.date = argv[++i];
    else if (arg === "--out-dir") args.outDir = argv[++i];
    else if (arg === "--config") args.config = argv[++i];
    else if (arg === "--max-items") args.maxItems = Number(argv[++i]);
    else if (arg === "--email-only") args.emailOnly = true;
    else if (arg === "--generate-only") args.generateOnly = true;
  }
  return args;
}

export async function loadEnvFile(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const raw = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = raw;
    }
  } catch {
    // Optional env files.
  }
}

export async function loadProjectEnv() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));
}

export function taipeiDateParts(dateArg) {
  const date = dateArg ? new Date(`${dateArg}T12:00:00+08:00`) : new Date();
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return {
    ymdSlash: `${pick("year")}/${pick("month")}/${pick("day")}`,
    ymdDash: `${pick("year")}-${pick("month")}-${pick("day")}`,
    weekday: pick("weekday"),
    dateLine: `${pick("year")} / ${pick("month")} / ${pick("day")}　（${pick("weekday")}）　　整理：AJ`
  };
}

function reportCutoffDate(dateArg) {
  return dateArg ? new Date(`${dateArg}T23:59:59+08:00`) : new Date();
}

function decodeEntities(text = "") {
  const map = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (_, name) => map[name] ?? `&${name};`);
}

function stripTags(text = "") {
  return decodeEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractRssItems(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  return [...itemBlocks, ...entryBlocks].map((block) => {
    const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    const link = stripTags(extractTag(block, "link")) || href || "";
    return {
      title: stripTags(extractTag(block, "title")),
      link: decodeEntities(link),
      published: stripTags(extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated")),
      snippet: stripTags(extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content")),
      sourceName: source.name,
      sourceRegion: source.region,
      sourceUrl: source.url
    };
  }).filter((item) => item.title && item.link);
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "film-daily-report-generator/2.0 (+cloud)",
        accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8"
      }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithRetry(url, { timeoutMs = 15000, retries = 2, retryDelayMs = 1500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchText(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function googleNewsRssUrl(query) {
  const params = new URLSearchParams({
    q: `${query} when:7d`,
    hl: "zh-TW",
    gl: "TW",
    ceid: "TW:zh-Hant"
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function sourceDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function shouldExclude(item, excludeKeywords = []) {
  const haystack = `${item.title} ${item.snippet}`.toLowerCase();
  return excludeKeywords.some((kw) => haystack.includes(String(kw).toLowerCase()));
}

function isRelevant(item, relevanceKeywords = []) {
  if (!relevanceKeywords.length) return true;
  const haystack = `${item.title} ${item.snippet} ${item.sourceName} ${item.sourceUrl}`.toLowerCase();
  return relevanceKeywords.some((kw) => haystack.includes(String(kw).toLowerCase()));
}

function parsePublishedDate(text) {
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Google News RSS's own "when:Nd" filter is unreliable on long, grouped
// site: OR queries and can silently let years-old articles through, so we
// re-check the parsed pubDate ourselves instead of trusting it blindly.
// Undated items are dropped by default. RSS providers can refresh old links
// without a trustworthy article date, and those stale items should not be
// promoted as today's news.
function isWithinAgeWindow(item, maxAgeDays, now = new Date(), requirePublishedDate = true) {
  const date = parsePublishedDate(item.published);
  if (!date) return !requirePublishedDate;
  const ageMs = now.getTime() - date.getTime();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const futureToleranceMs = 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs && ageMs >= -futureToleranceMs;
}

function hasPastYearInTitle(item, reportYear) {
  const haystack = `${item.title} ${item.snippet}`;
  const years = [...haystack.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  return years.some((year) => year < reportYear);
}

function isTimeSensitiveEvent(item) {
  const haystack = `${item.title} ${item.snippet}`;
  return /開拍|開鏡|殺青|首播|上線|定檔|上映|完結|收官|續訂|取消|宣布/.test(haystack);
}

function hasExplicitReportYear(item, reportYear) {
  const haystack = `${item.title} ${item.snippet}`;
  return haystack.includes(String(reportYear));
}

function dedupe(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = (item.link || item.title).replace(/[?#].*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export function filterCandidateFreshness(items, config = {}, { dateArg } = {}) {
  const maxAgeDays = config.maxAgeDays || 7;
  const requirePublishedDate = config.requirePublishedDate !== false;
  const reportDate = reportCutoffDate(dateArg);
  const reportYear = reportDate.getFullYear();
  const errors = [];

  const relevantItems = dedupe(items)
    .filter((item) => !shouldExclude(item, config.excludeKeywords))
    .filter((item) => isRelevant(item, config.relevanceKeywords));
  const withoutPastYears = relevantItems.filter((item) => !hasPastYearInTitle(item, reportYear));
  const pastYearDropped = relevantItems.length - withoutPastYears.length;
  const withFreshDates = withoutPastYears.filter((item) => isWithinAgeWindow(item, maxAgeDays, reportDate, requirePublishedDate));
  const staleDropped = withoutPastYears.length - withFreshDates.length;
  const freshItems = withFreshDates.filter((item) => !isTimeSensitiveEvent(item) || hasExplicitReportYear(item, reportYear));
  const unverifiedEventDropped = withFreshDates.length - freshItems.length;

  if (pastYearDropped > 0) {
    errors.push(`已過濾 ${pastYearDropped} 則標題或摘要含過去年份的候選新聞，避免舊聞被當成 ${reportYear} 年新聞。`);
  }
  if (staleDropped > 0) {
    const dateRule = requirePublishedDate ? "無可解析發布日期或" : "";
    errors.push(`已過濾 ${staleDropped} 則${dateRule}超過 ${maxAgeDays} 天的候選新聞（依來源標示的發布日期判斷）。`);
  }
  if (unverifiedEventDropped > 0) {
    errors.push(`已過濾 ${unverifiedEventDropped} 則開拍／首播／上線等時效事件，但標題與摘要缺少 ${reportYear} 年明確線索，避免舊事件被來源更新日期誤帶入。`);
  }

  return { items: freshItems, errors };
}

// ---------------------------------------------------------------------------
// Five-market collection (台灣／中國／日本／韓國／美國)
// ---------------------------------------------------------------------------

export const HISTORY_PATH = path.join(ROOT, "state", "seen-news.json");

function newsKey(text = "") {
  return String(text).replace(/[?#].*$/, "").toLowerCase().trim();
}

function titleKey(text = "") {
  return String(text)
    .replace(/\s[-|｜–—]\s[^-|｜–—]+$/, "") // drop trailing " - Source name"
    .replace(/[\s「」『』《》〈〉【】\[\]()（）"'“”‘’!！?？,，.。:：、|｜]/g, "")
    .toLowerCase()
    .slice(0, 40);
}

export async function loadHistory(historyPath = HISTORY_PATH) {
  try {
    return JSON.parse(await fs.readFile(historyPath, "utf8"));
  } catch {
    return { days: {} };
  }
}

function historySets(history) {
  const links = new Set();
  const titles = new Set();
  for (const entries of Object.values(history.days || {})) {
    for (const entry of entries) {
      if (entry.link) links.add(newsKey(entry.link));
      if (entry.title) titles.add(titleKey(entry.title));
    }
  }
  return { links, titles };
}

export async function saveHistory(history, dateKey, cards, keepDays = 14, historyPath = HISTORY_PATH) {
  const days = { ...(history.days || {}) };
  days[dateKey] = cards.map((card) => ({ link: card.link, title: card.originalTitle || card.title }));
  const kept = Object.keys(days).sort().slice(-keepDays);
  const output = { days: Object.fromEntries(kept.map((key) => [key, days[key]])) };
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.writeFile(historyPath, JSON.stringify(output, null, 2) + "\n", "utf8");
}

function marketGoogleNewsUrl(query, locale) {
  const params = new URLSearchParams({
    q: `${query} when:3d`,
    hl: locale?.hl || "zh-TW",
    gl: locale?.gl || "TW",
    ceid: locale?.ceid || "TW:zh-Hant"
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export async function collectCandidates(config, _maxItems, { dateArg, history } = {}) {
  const errors = [];
  const markets = config.markets || [];
  const perMarket = config.maxCandidatesPerMarket || 25;
  const seen = historySets(history || { days: {} });
  const byMarket = Object.fromEntries(markets.map((m) => [m.name, []]));

  // Direct RSS feeds (Deadline / Variety / THR / Soompi …): their market is
  // the configured source region.
  for (const source of config.sources.filter((s) => s.feed)) {
    try {
      const xml = await fetchText(source.feed);
      const items = extractRssItems(xml, source).map((item) => ({ ...item, market: source.region }));
      if (byMarket[source.region]) byMarket[source.region].push(...items);
    } catch (error) {
      errors.push(`${source.name} feed 抓取失敗：${error.message}`);
    }
  }

  // Market-specific Google News queries, each in that market's own language
  // edition, so Japan / Korea / China are actually searched every day.
  for (const market of markets) {
    for (const keyword of market.keywords || []) {
      try {
        const xml = await fetchTextWithRetry(marketGoogleNewsUrl(keyword, market.locale));
        const items = extractRssItems(xml, { name: "Google News", region: market.name, url: "https://news.google.com/" })
          .map((item) => {
            // Google News titles end with " - 媒體名稱"; keep the real outlet as the source.
            const outlet = item.title.match(/\s-\s([^-]+)$/)?.[1]?.trim();
            return { ...item, sourceName: outlet || item.sourceName, market: market.name };
          });
        byMarket[market.name].push(...items);
      } catch (error) {
        errors.push(`${market.name} 搜尋失敗「${keyword}」：${error.message}`);
      }
      await sleep(400);
    }
  }

  const items = [];
  let repeatedDropped = 0;
  const counts = {};
  for (const market of markets) {
    const fresh = filterCandidateFreshness(byMarket[market.name], config, { dateArg });
    errors.push(...fresh.errors.map((message) => `［${market.name}］${message}`));
    const notSeen = fresh.items.filter((item) => {
      const repeated = seen.links.has(newsKey(item.link)) || seen.titles.has(titleKey(item.title));
      if (repeated) repeatedDropped += 1;
      return !repeated;
    });
    const picked = notSeen.slice(0, perMarket);
    counts[market.name] = picked.length;
    items.push(...picked);
  }
  if (repeatedDropped) errors.push(`已排除 ${repeatedDropped} 則近 ${config.historyDays || 14} 天日報已收錄過的新聞。`);

  // Stable reference ids handed to the model, so every card can be traced
  // back to a real candidate (title / source / date / link come from here,
  // never from the model).
  items.forEach((item, idx) => { item.ref = `N${idx + 1}`; });
  return { items, errors, counts };
}

function formatCandidateDigest(items, markets) {
  return markets.map((market) => {
    const list = items.filter((item) => item.market === market.name);
    const body = list.map((item) => [
      `[${item.ref}] ${item.title}`,
      `  來源：${item.sourceName}｜日期：${item.published || "未提供"}`,
      `  摘要線索：${truncate(item.snippet || "無", 220)}`
    ].join("\n")).join("\n");
    return `=== ${market.name}（${list.length} 則候選）===\n${body || "（無候選）"}`;
  }).join("\n\n");
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

function cleanJsonText(text) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function truncate(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

export async function callOpenAIStructured({ config, dateInfo, items, errors }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("找不到 OPENAI_API_KEY。請在雲端環境變數中設定。");

  const model = process.env.OPENAI_MODEL || config.defaultModel || "gpt-5.2";
  const perMarket = config.itemsPerMarket || 8;
  const marketNames = (config.markets || []).map((m) => m.name);
  const instructions = [
    "你是台灣影視公司的產業日報總編，讀者是電影宣傳、發行與企劃同事。",
    "請使用台灣繁體中文與台灣用語，禁止簡體字。日文、韓文、英文新聞請翻成自然的中文標題與摘要，片名用台灣通行譯名，沒有譯名就保留原文。",
    `日報分成五個市場：${marketNames.join("、")}。每個市場依重要性排序列出 ${perMarket + 2} 則（最後兩則是備選，系統會自動取前 ${perMarket} 則有效的），優先順序：票房數字 > 定檔／上映／上線 > 開拍、選角、併購、發行權交易 > 影展與獎項 > 政策與補助。`,
    "同一部作品或同一事件，在整份日報（五個市場加起來）只能出現 1 次；不同媒體報導同一件事也算同一則。每則卡片的 work 欄位填主要作品名或主角公司名，用來檢查重複。",
    "市場歸屬規則：作品的製作、選角、續集、平台續訂消息，歸作品原產國（例如韓片續集一律放韓國，不可放台灣）；在某地上映的票房或宣傳活動，歸上映地（例如日本片在台灣的票房放台灣、好萊塢片在韓國的票房放韓國）。台灣區只放台灣本地產業、國片國劇，或發生在台灣市場的事。",
    "中國區只放中國大陸的電影、陸劇、平台與政策新聞；Netflix、YouTube 等國際平台的新聞不算中國，除非事件發生在中國市場。",
    "只能使用候選清單中的新聞，每則卡片必須填入該則新聞的 ref（例如 N12）。不要自己編造新聞。",
    `若某市場可用的新聞不到 ${perMarket} 則，就只放實際有的數量，絕對不要用空白、『待補充』或『來源未提供』湊數。`,
    "排除八卦、私生活、影評心得、片單懶人包、與影視產業無關的新聞；一般科技、AI、就業、股市新聞也排除，除非主角是影視公司或影視作品。",
    "summary：用一到兩句寫清楚發生什麼事，必須包含具體片名、公司、數字或日期。",
    "why：一到兩句，從台灣電影宣傳／發行的角度寫這件事值得注意的地方。每則都要針對該新聞寫，不得套用通用句，不同新聞不可出現相同句子。",
    "不要寫『公司參考』、『管理提示』或行動建議清單。",
    "highlights：從全部新聞中挑最重要的 3 則做今日重點，title 為一句標題、body 為兩到三句說明。",
    "upcoming：只列五個市場內、新聞明確寫出日期且在今天之後的上映、上線、頒獎或影展節點，最多 8 個，date 用 M/D 格式；日期不明確或已改期未定的不要列；沒有就給空陣列。",
    "insights：2 到 3 則跨市場觀察，每則要引用今天新聞中的具體事實（寫片名，不要寫 N12 這類編號）。",
    "只輸出 JSON，不要加 Markdown 或註解。",
    "JSON 格式：",
    JSON.stringify({
      highlights: [{ title: "", body: "" }],
      markets: marketNames.map((name) => ({ name, items: [{ ref: "N1", work: "", label: "票房", title: "", summary: "", why: "" }] })),
      upcoming: [{ date: "10/24", event: "" }],
      insights: [{ title: "", body: "" }]
    }),
    "label 請用 2～4 字分類，例如：票房、上映、上線、開拍、選角、併購、發行、影展、獎項、政策、平台。"
  ].join("\n");

  const input = [
    `今天是 ${dateInfo.ymdSlash}（${dateInfo.weekday}），請產出今天的影視產業日報。`,
    "候選新聞如下（已依市場分組，並排除近兩週已報導過的新聞）：",
    formatCandidateDigest(items, config.markets || []),
    errors.length ? `抓取備註：\n${errors.slice(0, 20).join("\n")}` : ""
  ].join("\n\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, instructions, input })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OpenAI API 失敗：${res.status} ${JSON.stringify(json)}`);
  const text = json.output_text || json.output?.flatMap((item) => item.content ?? []).map((part) => part.text || "").join("\n") || "";
  return JSON.parse(cleanJsonText(text));
}

// ---------------------------------------------------------------------------
// Normalise: attach real source / date / link from the candidate list, drop
// anything that cannot be traced, de-duplicate, and never pad with blanks.
// ---------------------------------------------------------------------------

function formatTaipeiDate(text) {
  const date = text ? new Date(text) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return `${pick("month")}/${pick("day")}`;
}

export function normalizeReport(raw, { items, config, dateInfo }) {
  const byRef = new Map(items.map((item) => [item.ref, item]));
  const perMarket = config.itemsPerMarket || 8;
  const usedRefs = new Set();
  const usedSentences = new Set();
  const usedWorks = new Set();
  const workKey = (text) => String(text || "").replace(/[\s《》〈〉「」『』:：·・]/g, "").toLowerCase();
  const marketNames = (config.markets || []).map((m) => m.name);
  const rawMarkets = Array.isArray(raw?.markets) ? raw.markets : [];

  const markets = marketNames.map((name) => {
    const rawItems = rawMarkets.find((m) => m?.name === name)?.items || [];
    const cards = [];
    for (const card of rawItems) {
      const candidate = byRef.get(String(card?.ref || "").trim());
      if (!candidate || usedRefs.has(candidate.ref)) continue;
      const title = truncate(card.title, 70);
      const summary = truncate(card.summary, 200);
      const why = truncate(card.why, 200);
      if (!title || !summary || !why) continue;
      if (/待補充|來源未提供|未提供標題/.test(`${title}${summary}${why}`)) continue;
      if (usedSentences.has(why) || usedSentences.has(summary)) continue; // templated text
      // Same film / company already covered elsewhere in today's report.
      const work = workKey(card.work) || workKey(title.match(/《([^》]+)》/)?.[1]);
      if (work && usedWorks.has(work)) continue;
      if (work) usedWorks.add(work);
      usedRefs.add(candidate.ref);
      usedSentences.add(why);
      usedSentences.add(summary);
      cards.push({
        label: truncate(card.label || "產業", 6),
        title,
        summary,
        why,
        source: truncate(candidate.sourceName, 30),
        date: formatTaipeiDate(candidate.published) || "日期未標示",
        link: candidate.link,
        originalTitle: candidate.title
      });
      if (cards.length >= perMarket) break;
    }
    return { name, cards };
  });

  const stripRefs = (text) => String(text || "").replace(/[（(]\s*N\d+\s*[)）]/g, "").replace(/\bN\d+\b/g, "");
  const reportMonth = Number(dateInfo.ymdDash.slice(5, 7));
  const sortKey = (date) => {
    const [m, d] = String(date).split("/").map(Number);
    if (!m || !d) return 9999;
    return (m < reportMonth ? m + 12 : m) * 100 + d; // next year's months sort after this year's
  };
  const clean = (list, max, fields) => (Array.isArray(list) ? list : [])
    .filter((item) => fields.every((f) => String(item?.[f] || "").trim() && !/待補充/.test(item[f])))
    .slice(0, max);

  return {
    dateInfo,
    highlights: clean(raw?.highlights, 3, ["title", "body"]).map((h) => ({ title: truncate(stripRefs(h.title), 70), body: truncate(stripRefs(h.body), 260) })),
    markets,
    upcoming: clean(raw?.upcoming, 8, ["date", "event"])
      .filter((u) => /^\d{1,2}\/\d{1,2}/.test(String(u.date).trim()) && !/未定|未明|改檔|延期/.test(u.event))
      .map((u) => ({ date: truncate(u.date, 12), event: truncate(stripRefs(u.event), 80) }))
      .sort((a, b) => sortKey(a.date) - sortKey(b.date)),
    insights: clean(raw?.insights, 3, ["title", "body"]).map((x) => ({ title: truncate(stripRefs(x.title), 40), body: truncate(stripRefs(x.body), 260) }))
  };
}

// ---------------------------------------------------------------------------
// Output: plain text (email body + .md) and black-gold Word document
// ---------------------------------------------------------------------------

export function renderMarkdown(data, reporter = "AJ") {
  const { dateInfo } = data;
  const lines = [];
  lines.push("影視產業日報");
  lines.push(`${dateInfo.ymdSlash}（${dateInfo.weekday}） 整理：${reporter}`);
  lines.push("");
  if (data.highlights.length) {
    lines.push("一 今日重點", "");
    data.highlights.forEach((h, idx) => lines.push(`${String(idx + 1).padStart(2, "0")} ${h.title}`, `   ${h.body}`, ""));
  }
  lines.push("二 五大市場動態", "");
  for (const market of data.markets) {
    lines.push(`【${market.name}】${market.cards.length} 則`);
    if (!market.cards.length) lines.push("  本日沒有通過時效查核的新聞。");
    market.cards.forEach((card, idx) => {
      lines.push(`${idx + 1}. [${card.label}] ${card.title}`);
      lines.push(`   來源：${card.source}｜日期：${card.date}`);
      lines.push(`   摘要：${card.summary}`);
      lines.push(`   觀察：${card.why}`);
    });
    lines.push("");
  }
  if (data.upcoming.length) {
    lines.push("三 接下來要看", "");
    data.upcoming.forEach((u) => lines.push(`- ${u.date}　${u.event}`));
    lines.push("");
  }
  if (data.insights.length) {
    lines.push("四 本期觀察", "");
    data.insights.forEach((x) => lines.push(`◆ ${x.title}`, `  ${x.body}`, ""));
  }
  return lines.join("\n");
}

const FONT = "Microsoft JhengHei";
const GOLD = "C9A227";
const BLACK = "111111";
const GREY = "666666";
const TEXT = "222222";
const CONTENT_WIDTH = 9638; // A4 minus 2cm margins, in DXA

export async function buildDocx(data, outputDocx, reporter = "AJ") {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
    ShadingType, BorderStyle, AlignmentType, Footer, PageNumber, ExternalHyperlink
  } = await import("docx");

  const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 21, bold: o.bold, italics: o.italics, color: o.color || TEXT });
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const band = (children, pad = 200) => new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: BLACK, color: "auto" },
      borders: noBorders,
      margins: { top: pad, bottom: pad, left: 300, right: 300 },
      children
    })] })]
  });
  const sectionHead = (num, title) => [
    new Paragraph({ spacing: { before: 360 }, children: [] }),
    band([new Paragraph({ children: [run(`${num}  `, { bold: true, color: GOLD, size: 26 }), run(title, { bold: true, color: "FFFFFF", size: 26 })] })], 100),
    new Paragraph({ spacing: { after: 120 }, children: [] })
  ];

  const out = [];
  out.push(band([
    new Paragraph({ children: [run("影視產業日報", { bold: true, color: GOLD, size: 44 })] }),
    new Paragraph({ spacing: { before: 80 }, children: [
      run(`${data.dateInfo.ymdSlash.replace(/\//g, " / ")}（${data.dateInfo.weekday}）`, { color: "FFFFFF", size: 22 }),
      run(`    整理：${reporter}`, { color: GOLD, size: 22 })
    ] })
  ], 280));

  let section = 0;
  const nums = ["一", "二", "三", "四"];
  if (data.highlights.length) {
    out.push(...sectionHead(nums[section++], "今日重點"));
    data.highlights.forEach((h, idx) => {
      out.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [run(`${String(idx + 1).padStart(2, "0")}  `, { bold: true, color: GOLD, size: 24 }), run(h.title, { bold: true, size: 23 })] }));
      out.push(new Paragraph({ indent: { left: 480 }, spacing: { after: 120, line: 320 }, children: [run(h.body)] }));
    });
  }

  out.push(...sectionHead(nums[section++], "五大市場動態"));
  for (const market of data.markets) {
    out.push(new Paragraph({ spacing: { before: 240, after: 40 }, children: [run("▍", { color: GOLD, size: 26, bold: true }), run(market.name, { bold: true, size: 26, color: BLACK }), run(`　${market.cards.length} 則`, { color: GREY, size: 18 })] }));
    out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 1 } }, spacing: { after: 160 }, children: [] }));
    if (!market.cards.length) {
      out.push(new Paragraph({ indent: { left: 360 }, children: [run("本日沒有通過時效查核的新聞。", { color: GREY, size: 20 })] }));
    }
    market.cards.forEach((card, idx) => {
      out.push(new Paragraph({ keepNext: true, spacing: { before: 100, after: 40 }, children: [run(`${idx + 1}. `, { bold: true, color: GOLD }), run(`【${card.label}】`, { bold: true, color: GOLD }), run(card.title, { bold: true, size: 22 })] }));
      out.push(new Paragraph({ keepNext: true, indent: { left: 360 }, spacing: { after: 40 }, children: [
        run(`來源：${card.source}｜日期：${card.date}｜`, { color: GREY, size: 18 }),
        new ExternalHyperlink({ link: card.link, children: [new TextRun({ text: "原文連結", font: FONT, size: 18, color: GOLD, underline: {} })] })
      ] }));
      out.push(new Paragraph({ keepNext: true, indent: { left: 360 }, spacing: { after: 40, line: 310 }, children: [run("摘要　", { bold: true, size: 20 }), run(card.summary, { size: 20 })] }));
      out.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 140, line: 310 }, children: [run("觀察　", { bold: true, color: GOLD, size: 20 }), run(card.why, { size: 20 })] }));
    });
  }

  if (data.upcoming.length) {
    out.push(...sectionHead(nums[section++], "接下來要看"));
    const c1 = 2000;
    const c2 = CONTENT_WIDTH - c1;
    const cellBorders = { top: none, left: none, right: none, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } };
    const cell = (width, child) => new TableCell({ width: { size: width, type: WidthType.DXA }, borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [child] });
    out.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [c1, c2],
      rows: data.upcoming.map((u) => new TableRow({ children: [
        cell(c1, new Paragraph({ children: [run(u.date, { bold: true, color: GOLD })] })),
        cell(c2, new Paragraph({ children: [run(u.event, { size: 20 })] }))
      ] }))
    }));
  }

  if (data.insights.length) {
    out.push(...sectionHead(nums[section++], "本期觀察"));
    data.insights.forEach((x) => {
      out.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [run("◆ ", { color: GOLD, bold: true }), run(x.title, { bold: true, size: 22 })] }));
      out.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 120, line: 320 }, children: [run(x.body)] }));
    });
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        run(`影視產業日報｜${data.dateInfo.ymdSlash}　整理：${reporter}　　`, { size: 16, color: GREY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GOLD })
      ] })] }) },
      children: out
    }]
  });
  await fs.mkdir(path.dirname(outputDocx), { recursive: true });
  await fs.writeFile(outputDocx, await Packer.toBuffer(doc));
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function ensureOutputDir(primary, fallback) {
  try {
    await fs.mkdir(primary, { recursive: true });
    await fs.access(primary);
    return primary;
  } catch {
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }
}

export async function generateCloudReport({ dateArg, outDirArg, configPathArg, aiReport }) {
  await loadProjectEnv();
  const configFile = configPathArg ? path.resolve(configPathArg) : CONFIG_PATH;
  const config = JSON.parse(await fs.readFile(configFile, "utf8"));
  const reporter = config.reporter || "AJ";
  const dateInfo = taipeiDateParts(dateArg);
  const history = await loadHistory();

  const { items, errors, counts } = await collectCandidates(config, 0, { dateArg, history });
  console.log(`候選新聞：${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join("、")}`);
  if (errors.length) console.log(errors.join("\n"));

  const raw = items.length
    ? (aiReport ? await aiReport({ config, dateInfo, items, errors }) : await callOpenAIStructured({ config, dateInfo, items, errors }))
    : {};
  const data = normalizeReport(raw, { items, config, dateInfo });
  console.log(`收錄：${data.markets.map((m) => `${m.name} ${m.cards.length}`).join("、")}`);

  const primaryOut = outDirArg || process.env.CLOUD_REPORT_OUTPUT_DIR || path.join(ROOT, "outputs");
  const outDir = await ensureOutputDir(primaryOut, path.join(ROOT, config.fallbackOutputDirectory || "outputs"));
  const stem = `film_daily_report_${dateInfo.ymdDash}`;
  const mdPath = path.join(outDir, `${stem}.md`);
  const docxPath = path.join(outDir, `${stem}.docx`);
  const markdown = renderMarkdown(data, reporter);
  await fs.writeFile(mdPath, markdown.trimEnd() + "\n", "utf8");
  await buildDocx(data, docxPath, reporter);

  // Remember what went out today so the next days never repeat it.
  await saveHistory(history, dateInfo.ymdDash, data.markets.flatMap((m) => m.cards), config.historyDays || 14);

  return { config, dateInfo, outDir, markdown, errors, items, data, mdPath, docxPath };
}

export async function sendViaGmail({ to, from, subject, html, text, attachments = [] }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("找不到 GMAIL_USER 或 GMAIL_APP_PASSWORD。");

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter.sendMail({
    from: from || user,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html,
    attachments: attachments.map((item) => ({ filename: item.filename, content: Buffer.from(item.content, "base64") }))
  });
}
