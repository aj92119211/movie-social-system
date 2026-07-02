import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, generateCloudReport, loadProjectEnv } from "./film-report-cloud-structured.mjs";
import { sendReportEmail } from "./report-email-lib.mjs";

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
    maxItemsArg: args.maxItems,
    structuredArg: true
  });

  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM;
  if (!to || !from) {
    console.log(`報表已輸出：${result.textPath} / ${result.docxPath}`);
    console.log("未設定 REPORT_EMAIL_TO 或 REPORT_EMAIL_FROM。");
    return;
  }

  const [textBuffer, docxBuffer] = await Promise.all([
    fs.readFile(result.textPath),
    fs.readFile(result.docxPath)
  ]);

  const emailResult = await sendReportEmail({
    apiKey: process.env.RESEND_API_KEY,
    to,
    from,
    subject: `影視產業日報 ${result.dateInfo.ymdDash}`,
    text: result.markdown,
    html: `
      <div style="font-family:'Microsoft JhengHei',sans-serif;line-height:1.7;color:#1f2937">
        <p>影視產業日報如下，附件包含文字版與 Word 檔。</p>
        <pre style="white-space:pre-wrap;font-family:'Microsoft JhengHei',sans-serif;background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:8px">${htmlEscape(result.markdown)}</pre>
      </div>
    `,
    attachments: [
      { filename: path.basename(result.textPath), content: textBuffer.toString("base64") },
      { filename: path.basename(result.docxPath), content: docxBuffer.toString("base64") }
    ]
  });

  console.log(`報表已寄出：${result.textPath} / ${result.docxPath}`);
  console.log(`寄送對象 ${emailResult.recipientCount} 位。`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
