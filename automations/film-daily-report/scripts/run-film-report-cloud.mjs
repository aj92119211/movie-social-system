import { parseArgs, generateCloudReport, loadProjectEnv, sendViaResend } from "./film-report-cloud-lib.mjs";
import fs from "node:fs/promises";
import path from "node:path";

function htmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadProjectEnv();

  const result = await generateCloudReport({
    dateArg: args.date,
    outDirArg: args.outDir,
    configPathArg: args.config,
    maxItemsArg: args.maxItems
  });

  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM;
  if (!to || !from) {
    console.log(`雲端版日報已產出：${result.mdPath}；${result.docxPath}`);
    console.log("尚未寄信，因為未設定 REPORT_EMAIL_TO / REPORT_EMAIL_FROM。");
    return;
  }

  const [mdBuffer, docxBuffer] = await Promise.all([
    fs.readFile(result.mdPath),
    fs.readFile(result.docxPath)
  ]);

  await sendViaResend({
    to,
    from,
    subject: `每日影劇日報 ${result.dateInfo.ymdDash}`,
    text: result.markdown,
    html: `
      <div style="font-family:'Microsoft JhengHei',sans-serif;line-height:1.7;color:#1f2937">
        <p>今天的影劇日報已附上 Markdown 與 Word 檔。</p>
        <pre style="white-space:pre-wrap;font-family:'Microsoft JhengHei',sans-serif;background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:8px">${htmlEscape(result.markdown)}</pre>
      </div>
    `,
    attachments: [
      { filename: path.basename(result.mdPath), content: mdBuffer.toString("base64") },
      { filename: path.basename(result.docxPath), content: docxBuffer.toString("base64") }
    ]
  });

  console.log(`雲端版日報已產出並寄出：${result.mdPath}；${result.docxPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
