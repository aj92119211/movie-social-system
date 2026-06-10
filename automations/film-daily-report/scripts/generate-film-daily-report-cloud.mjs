import { generateCloudReport, parseArgs } from "./film-report-cloud-lib.mjs";

const args = parseArgs(process.argv.slice(2));

generateCloudReport({
  dateArg: args.date,
  outDirArg: args.outDir,
  configPathArg: args.config,
  maxItemsArg: args.maxItems
}).then((result) => {
  console.log(`雲端版日報已產出：${result.mdPath}；${result.docxPath}`);
  if (result.errors.length) {
    console.log(`抓取警告 ${result.errors.length} 則，已盡量用可取得來源完成。`);
  }
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
