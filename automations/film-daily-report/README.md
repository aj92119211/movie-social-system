# Film Daily Report Cloud

這是獨立於主網站的雲端日報子專案。

固定規則：

- 使用 `templates/film_daily_report_template.docx` 當唯一版型母版
- **切勿用 Microsoft Word 開啟並儲存這份模板。** 內容欄位是靠 `{{report_title}}`、`{{taiwan_1_title}}` 這類具名佔位符做文字替換（見 `scripts/film-report-cloud-lib.mjs` 的 `buildReplacements` / `applyTemplate`），Word 重新存檔常會把同一個佔位符拆進兩個文字節點，導致替換失敗。若真的需要調整版面，請直接編輯 `word/document.xml`（模板本質是一個 zip），或找人重新產生模板後比照現有佔位符命名。
- 全文字體固定 `微軟正黑體`
- 內容必須帶入台灣影視產業資訊，不可只有國際新聞
- 每天台灣時間 11:00 由 GitHub Actions 執行
- 成功後將 `.md` 與 `.docx` 作為附件寄到指定信箱

## GitHub Secrets

需要在 repository 的 Actions Secrets 設定：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`（可省略）
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `REPORT_EMAIL_TO`
- `REPORT_EMAIL_FROM`

建議：

- `GMAIL_USER`：你專門用來寄日報的 Gmail
- `GMAIL_APP_PASSWORD`：Google 兩步驟驗證後建立的 App Password
- `REPORT_EMAIL_TO`：收件人，可填 1 個或多個，若多個請用逗號分隔
- `REPORT_EMAIL_FROM`：可先直接填和 `GMAIL_USER` 相同

## 手動執行

```bash
npm install
npm run daily:cloud
```
