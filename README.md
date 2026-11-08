# Flora 甜點研究室（flora-intro）

Flora 的個人作品集網站（繁中 / English / 日本語 / 한국어 / Tiếng Việt），含訪客留言板與 AI 一句話總結。部署在 Cloudflare Pages：靜態頁面放 `public/`，API 是 Pages Functions，留言存在 Cloudflare D1，AI 總結使用 Cloudflare Workers AI。**整個專案沒有任何需要付費的服務或 API 金鑰。**

## 專案結構

```
public/                    靜態網站（根目錄為繁中，en/ ja/ ko/ vi/ 為其他語言）
functions/api/messages.js  GET / POST /api/messages：留言板
functions/api/summary.js   POST /api/summary：AI 一句話總結（含快取）
lib/                       共用工具（JSON 回應、D1 速率限制）
migrations/0001_init.sql   D1 資料表
```

## 部署到 Cloudflare Pages

1. **建立 Pages 專案**：Workers & Pages → Create → Pages → Connect to Git → 選這個 repo。Framework preset 選 None，Build command 留空，Build output directory 填 `public`。
2. **建立 D1 資料庫**：Storage & Databases → D1 → Create database，名稱 `flora-intro`。進入 Console，貼上 [`migrations/0001_init.sql`](migrations/0001_init.sql) 執行。
3. **綁定 D1**：Pages 專案 → Settings → Bindings → Add → D1 database，Variable name 填 `DB`（Production 與 Preview 都要）。
4. **綁定 Workers AI**：同一頁 Add → Workers AI，Variable name 填 `AI`。
5. 重新部署一次讓綁定生效。

## 行為說明

- AI 總結使用 `@cf/zai-org/glm-4.7-flash`，只取最新 50 則留言；留言沒有變動時直接回傳快取，不會重複呼叫 AI。
- Workers AI 免費方案每天有 10,000 Neurons 額度，用完時總結會暫時失敗（頁面顯示「AI 總結暫時無法使用」），**不會自動收費**，隔天（UTC 00:00）重置。
- 留言每個 IP 每小時最多 10 則、總結每小時最多 20 次（記錄在 D1 的 `rate_limits`，IP 以雜湊儲存）。

## 查看留言

D1 Console：

```sql
SELECT id, name, message, created_at FROM messages ORDER BY id DESC;
```

## 不再使用

原本的 Express + SQLite + Zeabur 版本（`server.js`，AI 總結走 Anthropic API）保留在 `main` 分支的歷史中，遷移完成後 `cloudflare` 分支會合併為新的 `main`。
