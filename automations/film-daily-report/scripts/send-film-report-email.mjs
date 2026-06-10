import fs from "node:fs/promises";
import path from "node:path";
import {
  ROOT,
  loadProjectEnv,
  parseArgs,
  taipeiDateParts,
  generateCloudReport,
  sendViaGmail
} from "./film-report-cloud-lib.mjs";

function htmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function resolveFiles(args, dateInfo) {
  if (!args.generateOnly) {
    const outDir = args.outDir || process.env.CLOUD_REPORT_OUTPUT_DIR || path.join(ROOT, "outputs");
    const stem = `film_daily_report_${dateInfo.ymdDash}`;
    const mdPath = path.join(outDir, `${stem}.md`);
    const docxPath = path.join(outDir, `${stem}.docx`);
    try {
      await fs.access(mdPath);
      await fs.access(docxPath);
      const markdown = await fs.readFile(mdPath, "utf8");
      return { mdPath, docxPath, markdown };
    } catch {
      // Fall through and generate a fresh copy.
    }
  }

  const generated = await generateCloudReport({
    dateArg: args.date,
    outDirArg: args.outDir,
    configPathArg: args.config,
    maxItemsArg: args.maxItems
  });
  return generated;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadProjectEnv();
  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM || process.env.GMAIL_USER;
  if (!to || !from) {
    throw new Error("請設定 REPORT_EMAIL_TO 與 REPORT_EMAIL_FROM（或至少設定 GMAIL_USER）。");
  }

  const dateInfo = taipeiDateParts(args.date);
  const { mdPath, docxPath, markdown } = await resolveFiles(args, dateInfo);
  const [mdBuffer, docxBuffer] = await Promise.all([
    fs.readFile(mdPath),
    fs.readFile(docxPath)
  ]);

  const subject = `每日影劇日報 ${dateInfo.ymdDash}`;
  const html = `
    <div style="font-family:'Microsoft JhengHei',sans-serif;line-height:1.7;color:#1f2937">
      <p>今天的影劇日報已附上 Markdown 與 Word 檔。</p>
      <pre style="white-space:pre-wrap;font-family:'Microsoft JhengHei',sans-serif;background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:8px">${htmlEscape(markdown)}</pre>
    </div>
  `;

  await sendViaGmail({
    to,
    from,
    subject,
    html,
    text: markdown,
    attachments: [
      { filename: path.basename(mdPath), content: mdBuffer.toString("base64") },
      { filename: path.basename(docxPath), content: docxBuffer.toString("base64") }
    ]
  });

  console.log(`日報郵件已寄出：${to}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
