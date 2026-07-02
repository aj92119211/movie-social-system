const DISABLED_MESSAGE = [
  "此入口已停用。",
  "請改用 npm run daily:cloud。",
  "正式日報寄信流程已改走 structured pipeline：",
  "scripts/run-film-report-cloud.mjs"
].join("\n");

console.error(DISABLED_MESSAGE);
process.exitCode = 1;
