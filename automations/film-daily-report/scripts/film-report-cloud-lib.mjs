import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import nodemailer from "nodemailer";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
export const CONFIG_PATH = path.join(ROOT, "config", "film-daily-sources.json");
export const TEMPLATE_PATH = path.join(ROOT, "templates", "film_daily_report_template.docx");

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
// Undated items are kept (many Taiwan sources omit pubDate) rather than
// dropped, since we can't tell whether they're stale or just unlabeled.
function isWithinAgeWindow(item, maxAgeDays) {
  const date = parsePublishedDate(item.published);
  if (!date) return true;
  const ageMs = Date.now() - date.getTime();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const futureToleranceMs = 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs && ageMs >= -futureToleranceMs;
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

export async function collectCandidates(config, maxItems) {
  const items = [];
  const errors = [];
  const maxAgeDays = config.maxAgeDays || 7;

  for (const source of config.sources.filter((s) => s.feed)) {
    try {
      const xml = await fetchText(source.feed);
      items.push(...extractRssItems(xml, source));
    } catch (error) {
      errors.push(`${source.name} feed 抓取失敗：${error.message}`);
    }
  }

  const domains = config.sources.map((s) => sourceDomain(s.url)).filter(Boolean);
  const searchQueries = [...config.searchKeywords];
  for (const keyword of config.searchKeywords.slice(0, 12)) {
    const groupedSites = domains.slice(0, 16).map((d) => `site:${d}`).join(" OR ");
    searchQueries.push(`(${groupedSites}) ${keyword}`);
  }

  // Sequential with a short gap between requests: firing ~37 rapid Google
  // News RSS queries back-to-back from the same GitHub Actions IP gets
  // flagged as automated traffic and rate-limited mid-run, which is why
  // candidate counts used to swing wildly (a handful vs. 50+) from day to
  // day. Retrying transient failures keeps a bad request from just being
  // silently dropped.
  for (const query of searchQueries.slice(0, 40)) {
    try {
      const xml = await fetchTextWithRetry(googleNewsRssUrl(query));
      items.push(...extractRssItems(xml, { name: "Google News RSS", region: "跨區", url: "https://news.google.com/" }));
    } catch (error) {
      errors.push(`Google News RSS 查詢失敗「${query}」：${error.message}`);
    }
    await sleep(400);
  }

  const withinWindow = dedupe(items)
    .filter((item) => !shouldExclude(item, config.excludeKeywords))
    .filter((item) => isRelevant(item, config.relevanceKeywords));
  const freshItems = withinWindow.filter((item) => isWithinAgeWindow(item, maxAgeDays));
  const staleDropped = withinWindow.length - freshItems.length;
  if (staleDropped > 0) {
    errors.push(`已過濾 ${staleDropped} 則超過 ${maxAgeDays} 天的候選新聞（依來源標示的發布日期判斷）。`);
  }

  return {
    items: freshItems.slice(0, maxItems),
    errors
  };
}

function formatCandidateDigest(items) {
  return items.map((item, idx) => [
    `#${idx + 1}`,
    `標題：${item.title}`,
    `來源：${item.sourceName}`,
    `地區線索：${item.sourceRegion}`,
    `日期：${item.published || "來源未提供"}`,
    `連結：${item.link}`,
    `摘要線索：${item.snippet || "無"}`
  ].join("\n")).join("\n\n");
}

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

function normalizeCard(card = {}, defaults = {}) {
  return {
    country: truncate(card.country || defaults.country || "未定", 10),
    label: truncate(card.label || defaults.label || "產業焦點", 20),
    title: truncate(card.title || defaults.title || "未提供標題", 60),
    source: truncate(card.source || defaults.source || "來源未提供", 50),
    date: truncate(card.date || defaults.date || "來源未提供", 20),
    summary: truncate(card.summary || defaults.summary || "來源未提供", 140),
    why: truncate(card.why || defaults.why || "來源未提供", 170),
    action: truncate(card.action || defaults.action || "來源未提供", 170)
  };
}

function fillCards(items, count, defaults) {
  const list = Array.isArray(items) ? items.slice(0, count) : [];
  while (list.length < count) list.push({});
  return list.map((card) => normalizeCard(card, defaults));
}

function normalizeBulletGroup(items, fallbackPrefix) {
  const list = Array.isArray(items) ? items : [];
  while (list.length < 3) list.push({ headline: `${fallbackPrefix}${list.length + 1}`, body: "待補充。" });
  return list.slice(0, 3).map((item, idx) => ({
    headline: truncate(item.headline || `${fallbackPrefix}${idx + 1}`, 28),
    body: truncate(item.body || "待補充。", 90)
  }));
}

export function normalizeStructuredReport(raw, dateInfo, reporter) {
  const data = raw || {};
  return {
    reportTitle: truncate(data.report_title || data.reportTitle || "影劇產業日報摘要", 20),
    dateLine: `${dateInfo.ymdSlash.replace(/\//g, " / ")}　（${dateInfo.weekday}）　　整理：${reporter}`,
    highlights: (Array.isArray(data.highlight_cards) ? data.highlight_cards : []).slice(0, 3).map((item, idx) => ({
      title: truncate(item?.title || `重點 ${idx + 1}`, 50),
      body: truncate(item?.body || "待補充。", 120),
      action: truncate(item?.action || "待補充。", 100)
    })).concat(Array.from({ length: Math.max(0, 3 - (data.highlight_cards?.length || 0)) }, (_, idx) => ({
      title: `重點 ${idx + 1}`,
      body: "待補充。",
      action: "待補充。"
    }))).slice(0, 3),
    taiwanFocus: fillCards(data.taiwan_focus, 3, { country: "台灣" }),
    internationalFocus: fillCards(data.international_focus, 3, { country: "美國" }),
    seriesFocus: fillCards(data.series_focus, 3, { country: "美國", label: "影集" }),
    ottFilm: normalizeCard(data.ott_film, { country: "跨區", label: "OTT 電影" }),
    ottSeries: fillCards(data.ott_series, 3, { country: "跨區", label: "OTT 影集" }),
    releaseBox: {
      headline: truncate(data.release_box?.headline || "今日台灣端可公開驗證的即時上新有限", 40),
      body: truncate(data.release_box?.body || "建議同步對照本週票房與提案／補助節點，不必被娛樂零訊號牽著走。", 90)
    },
    featured: {
      title: truncate(data.featured?.title || "2026 TCCF PITCHING", 50),
      meta: truncate(data.featured?.meta || "提案市場　台灣", 30),
      reason: truncate(data.featured?.reason || "台灣內容對接國際買家與合製夥伴的核心節點。", 140),
      watch: truncate(data.featured?.watch || "觀察報名進度、國際案比例與成熟商務提案。", 100)
    },
    watchSections: {
      themes: normalizeBulletGroup(data.watch_sections?.themes, "題材趨勢"),
      market: normalizeBulletGroup(data.watch_sections?.market, "市場風向"),
      promotion: normalizeBulletGroup(data.watch_sections?.promotion, "宣傳操作"),
      observables: {
        institutions: truncate(data.watch_sections?.observables?.institutions || "TAICCA、全國電影票房統計資訊、TCCF PITCHING", 100),
        genres: truncate(data.watch_sections?.observables?.genres || "文化科技內容、可國際合製的影集／電影案", 100),
        metrics: truncate(data.watch_sections?.observables?.metrics || "票房平台、提案節點、補助名單", 100),
        actions: truncate(data.watch_sections?.observables?.actions || "確定主提案案、完成商務包與對外敘事", 100)
      }
    }
  };
}

export async function callOpenAIStructured({ config, dateInfo, items, errors }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("找不到 OPENAI_API_KEY。請在雲端環境變數中設定。");
  }

  const model = process.env.OPENAI_MODEL || config.defaultModel || "gpt-5.2";
  const instructions = [
    "你是影劇產業日報的總編與策略分析師。",
    "請使用繁體中文，禁止輸出簡體中文。",
    "受眾是影視公司老闆、主管、製片、發行與行銷團隊。",
    "內容必須是決策用情報，不是娛樂八卦摘要。",
    "台灣產業資訊必須進入主體，至少要有 3 則台灣焦點，優先考慮 TAICCA、TCCF、票房、補助、台灣影集與國片動態。",
    "只可使用提供的候選新聞，不要捏造來源、日期、標題、連結或事件。",
    "若資訊不足，請寫『來源未提供』或以保守表述處理，不要臆測。",
    "請只輸出 JSON，不要加 Markdown、註解或程式碼區塊。",
    "所有欄位都要填滿。",
    "標題請控制精準、可上版；摘要與公司參考請偏具體，避免空泛形容。",
    "JSON schema:",
    JSON.stringify({
      report_title: "影劇產業日報摘要",
      highlight_cards: [{ title: "", body: "", action: "" }],
      taiwan_focus: [{ country: "台灣", label: "", title: "", source: "", date: "", summary: "", why: "", action: "" }],
      international_focus: [{ country: "", label: "", title: "", source: "", date: "", summary: "", why: "", action: "" }],
      series_focus: [{ country: "", label: "", title: "", source: "", date: "", summary: "", why: "", action: "" }],
      ott_film: { country: "", label: "", title: "", source: "", date: "", summary: "", why: "", action: "" },
      ott_series: [{ country: "", label: "", title: "", source: "", date: "", summary: "", why: "", action: "" }],
      release_box: { headline: "", body: "" },
      featured: { title: "", meta: "", reason: "", watch: "" },
      watch_sections: {
        themes: [{ headline: "", body: "" }],
        market: [{ headline: "", body: "" }],
        promotion: [{ headline: "", body: "" }],
        observables: { institutions: "", genres: "", metrics: "", actions: "" }
      }
    })
  ].join("\n");

  const input = [
    `請產出 ${dateInfo.ymdSlash}（${dateInfo.weekday}）的影劇產業日報資料。`,
    "版型限制：必須適合固定 DOCX 模板，每個欄位請精煉，避免過長。",
    "候選新聞如下：",
    formatCandidateDigest(items),
    errors.length ? `抓取警告：\n${errors.join("\n")}` : ""
  ].join("\n\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ model, instructions, input })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`OpenAI API 失敗：${res.status} ${JSON.stringify(json)}`);
  const text = json.output_text || json.output?.flatMap((item) => item.content ?? []).map((part) => part.text || "").join("\n") || "";
  return JSON.parse(cleanJsonText(text));
}

// Fields are matched by name against literal {{token}} placeholders baked
// into templates/film_daily_report_template.docx, not by counting <w:t>
// nodes — see applyTemplate(). Fixed labels ("來源：", "▶ 值得注意　", …)
// and always-blank slots live directly in the template and don't need
// entries here.
export function buildReplacements(data) {
  const replacements = {};
  const set = (name, value = "") => { replacements[`{{${name}}}`] = value; };

  set("report_title", data.reportTitle);
  set("date_line", data.dateLine);

  set("highlight_1_title", data.highlights[0].title);
  set("highlight_1_body", data.highlights[0].body);
  set("highlight_1_action", data.highlights[0].action);
  set("highlight_2_title", data.highlights[1].title);
  set("highlight_2_body", data.highlights[1].body);
  set("highlight_3_title", data.highlights[2].title);
  set("highlight_3_body", data.highlights[2].body);
  set("highlight_3_action", data.highlights[2].action);

  const cardGroups = [
    ["taiwan", data.taiwanFocus],
    ["intl", data.internationalFocus],
    ["series", data.seriesFocus],
    ["ott_series", data.ottSeries]
  ];
  for (const [prefix, cards] of cardGroups) {
    cards.forEach((card, idx) => {
      const p = `${prefix}_${idx + 1}`;
      set(`${p}_country`, card.country);
      set(`${p}_label`, card.label);
      set(`${p}_title`, card.title);
      set(`${p}_source`, card.source);
      set(`${p}_date`, card.date);
      set(`${p}_summary`, card.summary);
      set(`${p}_why`, card.why);
      set(`${p}_action`, card.action);
    });
  }

  set("ott_film_country", data.ottFilm.country);
  set("ott_film_label", data.ottFilm.label);
  set("ott_film_title", data.ottFilm.title);
  set("ott_film_source", data.ottFilm.source);
  set("ott_film_date", data.ottFilm.date);
  set("ott_film_summary", data.ottFilm.summary);
  set("ott_film_why", data.ottFilm.why);
  set("ott_film_action", data.ottFilm.action);

  set("release_headline", `⚠ ${data.releaseBox.headline}`);
  set("release_body", data.releaseBox.body);

  set("featured_title", data.featured.title);
  set("featured_meta", data.featured.meta);
  set("featured_reason", data.featured.reason);
  set("featured_watch", data.featured.watch);

  const bulletGroups = [
    ["theme", data.watchSections.themes],
    ["market", data.watchSections.market],
    ["promotion", data.watchSections.promotion]
  ];
  for (const [prefix, items] of bulletGroups) {
    items.forEach((item, idx) => {
      set(`${prefix}_${idx + 1}_headline`, `◆ ${item.headline}`);
      set(`${prefix}_${idx + 1}_body`, item.body);
    });
  }

  set("observables_institutions", data.watchSections.observables.institutions);
  set("observables_genres", data.watchSections.observables.genres);
  set("observables_metrics", data.watchSections.observables.metrics);
  set("observables_actions", data.watchSections.observables.actions);

  return replacements;
}

function forceFont(xmlText, fontName) {
  return xmlText
    .replace(/新細明體/g, fontName)
    .replace(/PMingLiU/g, "Microsoft JhengHei")
    .replace(/Microsoft JhengHei/g, fontName)
    .replace(/Aptos Display/g, fontName)
    .replace(/Aptos/g, fontName)
    .replace(/Times New Roman/g, fontName)
    .replace(/Arial/g, fontName)
    .replace(/w:asciiTheme="[^"]+"/g, `w:ascii="${fontName}"`)
    .replace(/w:hAnsiTheme="[^"]+"/g, `w:hAnsi="${fontName}"`)
    .replace(/w:eastAsiaTheme="[^"]+"/g, `w:eastAsia="${fontName}"`)
    .replace(/w:cstheme="[^"]+"/g, `w:cs="${fontName}"`)
    .replace(/<a:latin typeface="[^"]*"/g, `<a:latin typeface="${fontName}"`)
    .replace(/<a:ea typeface="[^"]*"/g, `<a:ea typeface="${fontName}"`)
    .replace(/<a:cs typeface="[^"]*"/g, `<a:cs typeface="${fontName}"`)
    .replace(/script="Hant" typeface="[^"]*"/g, `script="Hant" typeface="${fontName}"`)
    .replace(/script="Bopo" typeface="[^"]*"/g, `script="Bopo" typeface="${fontName}"`);
}

export async function applyTemplate({ templatePath = TEMPLATE_PATH, replacements, outputDocx, fontName = "微軟正黑體" }) {
  const buffer = await fs.readFile(templatePath);
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntry("word/document.xml");
  if (!documentEntry) throw new Error("模板缺少 word/document.xml。");
  let documentXml = zip.readAsText(documentEntry, "utf8");

  // Checked up front, before any replacement happens: if the template is
  // ever reopened and resaved in Word, a {{token}} can get split across
  // two <w:t> runs (formatting/spell-check boundaries) or dropped
  // entirely. Either way it stops appearing as one contiguous substring in
  // the raw XML, so this catches both failure modes as a hard error
  // instead of silently shipping a docx with missing/misplaced content.
  const missingTokens = Object.keys(replacements).filter((token) => !documentXml.includes(token));
  if (missingTokens.length) {
    throw new Error(`模板中找不到以下佔位符，模板可能已被重新編輯過而拆散或遺失了文字節點：${missingTokens.join(", ")}`);
  }

  for (const [token, rawValue] of Object.entries(replacements)) {
    const value = String(rawValue ?? "");
    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    documentXml = documentXml.split(token).join(escaped);
  }
  zip.updateFile("word/document.xml", Buffer.from(documentXml, "utf8"));

  for (const entryName of ["word/styles.xml", "word/document.xml", "word/fontTable.xml", "word/theme/theme1.xml"]) {
    const entry = zip.getEntry(entryName);
    if (!entry) continue;
    const updated = forceFont(zip.readAsText(entry, "utf8"), fontName);
    zip.updateFile(entryName, Buffer.from(updated, "utf8"));
  }

  await fs.mkdir(path.dirname(outputDocx), { recursive: true });
  zip.writeZip(outputDocx);
}

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

export function renderMarkdown(data, dateInfo) {
  const lines = [];
  const pushCard = (card) => {
    lines.push(`- [${card.country}｜${card.label}] ${card.title}`);
    lines.push(`  來源：${card.source}`);
    lines.push(`  日期：${card.date}`);
    lines.push(`  摘要：${card.summary}`);
    lines.push(`  值得注意：${card.why}`);
    lines.push(`  公司參考：${card.action}`);
    lines.push("");
  };

  lines.push(data.reportTitle);
  lines.push(`${dateInfo.ymdSlash}（${dateInfo.weekday}） 整理：AJ`);
  lines.push("");
  lines.push("一 今日重點");
  lines.push("");
  data.highlights.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.title}`);
    lines.push(`   ${item.body}`);
    lines.push(`   管理提示：${item.action}`);
    lines.push("");
  });

  lines.push("二 新聞摘要");
  lines.push("");
  lines.push("台灣焦點");
  lines.push("");
  data.taiwanFocus.forEach(pushCard);
  lines.push("國際電影與市場");
  lines.push("");
  data.internationalFocus.forEach(pushCard);
  lines.push("影集焦點");
  lines.push("");
  data.seriesFocus.forEach(pushCard);
  lines.push("OTT 電影");
  lines.push("");
  pushCard(data.ottFilm);
  lines.push("OTT 影集");
  lines.push("");
  data.ottSeries.forEach(pushCard);

  lines.push("三 新上映／新上線");
  lines.push("");
  lines.push(`${data.releaseBox.headline}：${data.releaseBox.body}`);
  lines.push("");
  lines.push("四 備受期待");
  lines.push("");
  lines.push(`${data.featured.title}`);
  lines.push(`期待原因：${data.featured.reason}`);
  lines.push(`可持續觀察：${data.featured.watch}`);
  lines.push("");
  lines.push("五 值得關注");
  lines.push("");
  lines.push("題材趨勢");
  data.watchSections.themes.forEach((item) => lines.push(`- ${item.headline}：${item.body}`));
  lines.push("");
  lines.push("市場風向");
  data.watchSections.market.forEach((item) => lines.push(`- ${item.headline}：${item.body}`));
  lines.push("");
  lines.push("可借鏡的宣傳操作");
  data.watchSections.promotion.forEach((item) => lines.push(`- ${item.headline}：${item.body}`));
  lines.push("");
  lines.push("可觀察對象");
  lines.push(`- 機構：${data.watchSections.observables.institutions}`);
  lines.push(`- 題材：${data.watchSections.observables.genres}`);
  lines.push(`- 決策指標：${data.watchSections.observables.metrics}`);
  lines.push(`- 優先動作：${data.watchSections.observables.actions}`);
  lines.push("");

  return lines.join("\n");
}

export async function writeReportFiles({ markdown, docxSourceTemplate = TEMPLATE_PATH, replacements, outDir, dateInfo }) {
  const stem = `film_daily_report_${dateInfo.ymdDash}`;
  const mdPath = path.join(outDir, `${stem}.md`);
  const docxPath = path.join(outDir, `${stem}.docx`);
  await fs.writeFile(mdPath, markdown.trimEnd() + "\n", "utf8");
  await applyTemplate({ templatePath: docxSourceTemplate, replacements, outputDocx: docxPath, fontName: "微軟正黑體" });
  return { mdPath, docxPath };
}

export async function generateCloudReport({ dateArg, outDirArg, configPathArg, maxItemsArg }) {
  await loadProjectEnv();
  const configFile = configPathArg ? path.resolve(configPathArg) : CONFIG_PATH;
  const config = JSON.parse(await fs.readFile(configFile, "utf8"));
  const dateInfo = taipeiDateParts(dateArg);
  const maxItems = maxItemsArg || config.maxCandidateItems || 80;
  const { items, errors } = await collectCandidates(config, maxItems);
  const raw = await callOpenAIStructured({ config, dateInfo, items, errors });
  const data = normalizeStructuredReport(raw, dateInfo, config.reporter || "AJ");

  const primaryOut = outDirArg || process.env.CLOUD_REPORT_OUTPUT_DIR || path.join(ROOT, "outputs");
  const fallbackOut = path.join(ROOT, config.fallbackOutputDirectory || "outputs");
  const outDir = await ensureOutputDir(primaryOut, fallbackOut);
  const markdown = renderMarkdown(data, dateInfo);
  const replacements = buildReplacements(data);
  const files = await writeReportFiles({ markdown, replacements, outDir, dateInfo });
  return { config, dateInfo, outDir, markdown, replacements, errors, items, data, ...files };
}

export async function sendViaGmail({ to, from, subject, html, text, attachments = [] }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("找不到 GMAIL_USER 或 GMAIL_APP_PASSWORD。");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });

  return transporter.sendMail({
    from: from || user,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html,
    attachments: attachments.map((item) => ({
      filename: item.filename,
      content: Buffer.from(item.content, "base64")
    }))
  });
}
