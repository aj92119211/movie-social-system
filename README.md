# 電影社群行銷工作流系統

這是一個給影視行銷團隊使用的內部工作流系統，包含電影資料、素材庫、社群排程、AI 文案產生器、互動問答題庫與貼文數據分析。

## 功能

- 電影資料管理：可讀取、新增、編輯、刪除 Supabase `movies` 資料。
- 素材庫：依電影整理素材，支援外部連結。
- 社群排程：建立、編輯、刪除排程，並同步首頁近期排程。
- AI 文案產生器：可透過 OpenAI API 產生 Facebook、IG、Threads 文案。
- 互動問答題庫：管理社群互動題。
- 貼文數據分析：手動輸入單篇貼文數據並產生基礎分析。

## 環境變數

請在本機建立 `.env.local`，不要提交到 GitHub。

```text
SUPABASE_URL=https://你的專案代號.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
```

可選的社群分析 API：

```text
SOCIAL_ANALYTICS_PROVIDER=你的社群數據服務名稱
SOCIAL_ANALYTICS_API_URL=https://your-social-analytics-service.example.com/analyze
SOCIAL_ANALYTICS_API_KEY=你的社群數據服務 API Key
```

如果沒有設定社群分析 API，系統會使用手動數據分析模式。

## Supabase 資料表

請到 Supabase SQL Editor 執行：

```text
supabase/movies.sql
```

這會建立或更新 `public.movies` 資料表。

## 本機啟動

```bash
npm start
```

啟動後打開：

```text
http://127.0.0.1:5173/
```

測試電影 API：

```text
http://127.0.0.1:5173/api/movies
```

## Render 部署

Render 建議建立 Web Service。

### Build Command

```bash
npm install
```

### Start Command

```bash
npm start
```

### Render Environment Variables

請在 Render 後台加入：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_MODEL
```

如果要串外部社群分析 API，再加入：

```text
SOCIAL_ANALYTICS_PROVIDER
SOCIAL_ANALYTICS_API_URL
SOCIAL_ANALYTICS_API_KEY
```

`server.js` 會使用 Render 提供的 `PORT`，並監聽 `0.0.0.0`，可直接部署。

## GitHub 上傳注意事項

- `.env.local` 已加入 `.gitignore`，不要上傳真正的 API key。
- `.env.local.example` 可以上傳，裡面只能放範例值。
- 不要提交 `node_modules/`。
- 不要提交任何含有真實 OpenAI、Supabase key 的文字檔。

## Supabase 團隊共用資料

除了電影資料的 `supabase/movies.sql`，如果要讓其他電腦也能共同編輯素材庫、社群排程、互動問答題庫、貼文數據分析與近期活動，請在 Supabase SQL Editor 另外執行：

```text
supabase/workflow_collections.sql
```

這會建立 `public.workflow_collections` 資料表。Render 正式網址會透過後端 API 讀寫這張表，讓不同電腦看到同一份資料。
