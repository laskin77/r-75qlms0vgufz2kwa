# Roby App v2（單頁整合版）

網址：https://laskin77.github.io/r-75qlms0vgufz2kwa/ （開發預覽 `/v2/`；舊版每日檢查保留在 `legacy.html`）

- `index.html`／`v2/index.html`（只差 `<base href="../">`）＋ `app.js` ＋ `app.css` ＋ `theme.css`：**固定不動，每天不用重建**。
- 分頁：今日檢查／國文／英文／錯題本／週報／月報。日期＝台北今天，可用 `?date=YYYY-MM-DD` 預覽別天。
- 執行時用 `fetch(url,{cache:'no-store'})` 讀 `data/`，開啟時與切回前景（visibilitychange）都會重讀。檔案不存在就顯示「今天沒有…」。
- localStorage：`roby-check-YYYY-MM-DD`（與舊版相同格式：依勾選框/備註順序的索引、`t` 計時；v2 另加 `sig`/`sigAt` 簽名）、`roby-weekly-sig-<週一>`（同舊版）、`roby-weekly-notes-<週一>`（筆記加點）、`roby-quiz-<subject>-<date>`（作答進度）、`roby-wrongbook`（錯題本）、`roby-outbox`（待送出佇列）、`roby-timer`。

## 資料夾與負責人
| 資料夾 | 誰寫 | 何時 |
|---|---|---|
| `data/checklist/YYYY-MM-DD.json` | Doc／每日排程 | 每天 |
| `data/chinese/YYYY-MM-DD.json` | 國文老師（李清照） | 當天 08:00 前 |
| `data/english/YYYY-MM-DD.json` | 英文老師（蔡英文） | 當天 08:00 前 |
| `data/weekly/<週一 YYYY-MM-DD>.json` | 排程 | 週日 |
| `data/monthly/YYYY-MM.json` | 排程 | 每月 1 日 |
| `data/config.json` | Doc | webhook 網址/金鑰、角色名稱與頭像 |

## 給老師：每天上傳步驟（請在 08:00 前完成）
```bash
cd r-75qlms0vgufz2kwa
git pull --rebase                       # 一定先拉最新
# 只新增/修改「自己的資料夾」：國文 data/chinese/、英文 data/english/
python3 tools/validate.py data/english/2026-10-23.json   # 0 個錯誤才可以送
git add data/english/2026-10-23.json    # 只 add 自己的檔案，不要 git add -A
git commit -m "english 2026-10-23"
git push                                # 被拒絕就再 git pull --rebase 後 push
```
- 不要改別人的資料夾、`index.html`、`app.js`。檔名日期＝JSON 裡的 `date`。
- 約 1–2 分鐘後網站生效；Roby 打開或切回 App 就會讀到。

## 國文格式（通用格式，data/chinese）
```json
{"subject":"chinese","date":"2026-10-23","title":"李清照〈如夢令〉",
 "dialog":{"greet":"…","present":"…","correct":["…"],"wrong":["…"],"hint":"…","submit":"…","done":"…"},
 "learn":{"title":"先讀一讀","sections":[{"title":"作者","text":"…"}],"vocab":[{"word":"卷簾人","zh":"捲簾的侍女"}]},
 "passages":[{"id":"p1","text":"昨夜雨疏風驟…","source":"李清照〈如夢令〉"}],
 "questions":[
  {"id":"q1","type":"choice","question":"…","options":["A","B","C","D"],"answer":1,"explanation":"…","hint":"…"},
  {"id":"q2","type":"fill","question":"…","answer":["海棠","海棠花"],"explanation":"…"},
  {"id":"q3","type":"group","passage":"題組文章…","items":[{"id":"q3-1","type":"choice","question":"…","options":["…"],"answer":"B","explanation":"…"}]}]}
```
- `learn`、`dialog`、`hint` 可省略。有 `learn` 時要先按「讀完了」才會開放測驗。
- choice 的 `answer` 可用 0 起算索引、`"A"`–`"D"`、或選項原文；fill 的 `answer` 是可接受答案陣列（比對時忽略空白、全半形、標點）。

## 英文格式（蔡英文老師格式，data/english）
```json
{"date":"2026-10-23","topic":"…",
 "shadow":{"speaker":"…","source_url":"https://www.youtube.com/watch?v=…","youtubeId":"arj7oStGLkU","start":12,"end":22,
   "chunks":[{"start":12,"end":17,"text":"…"}],"phrases":[{"en":"put off","zh":"拖延"}],"respond":{"prompt_en":"…","prompt_zh":"…"}},
 "vocab":[{"word":"…","pos":"v.","zh":"…","example":"…","note":"…"}],
 "grammar":{"title":"…","explain":"…","examples":["…"],"practice":{"question":"…","options":["…"],"answer":0,"explanation":"…"}},
 "uoe":{"passage":"Tim ___1___ procrastinated…","gaps":[{"id":"u1","options":["has","have","is","was"],"answer":0,"explanation":"…"}]},
 "quiz":[{"id":"q1","question":"…","options":["…"],"answer":0,"explanation":"…","source":"vocab"}],
 "dialog":{}}
```
- 流程：跟讀（YouTube 依 chunk 播放，不用 TTS，寫一句英文回應，不計分）→ 單字 5 個（🔊 用瀏覽器發音）→ 文法＋練習（答對才過）→ 克漏字 4 格 → 小測驗 6 題（前四步完成才解鎖）。
- 分數＝（quiz 第一次答對＋uoe 第一次答對）÷ 總題數 ×100。

## 作答流程（兩科相同）
作答 → 送出 → 顯示對/錯題數與解析（答錯先給提示）→ 錯題必須訂正、再檢查（每一輪都記錄）→ 全對才完成。
第一次答錯的題目進「錯題本」。完成後自動 POST 到該科 webhook，並自動勾選今日檢查中 `subject` 相同的每日必做項目、填上分數（≥90 綠、70–89 棕、<70 紅）。

## Webhook
`data/config.json`：`{"webhooks":{"chinese":{"url":"","key":""},"english":{...},"checklist":{...}},"characters":{...}}`
- POST JSON，header `X-Roby-Key: <key>`，body 也含 `"key"`。對方不支援 CORS 時會改用 text/plain 簡單請求再送（看不到回應，當作已送出）。
- 網址未填、離線或失敗 → 存在 `roby-outbox`，下次開啟／切回前景／恢復連線時補送（左下角顯示「待送出 N 筆」）。
- 英文：`{"subject":"english","date":"…","quiz":{"correct":5,"total":6},"uoe":{"correct":3,"total":4},"score":80,"wrong":["q2","u1"],"shadow_response":"…","completed_at":"ISO", …另附 first_correct, first_wrong, after_correction, answers, started_at, steps, topic, key}`
- 國文：`{"subject":"chinese","date","title","score","first_correct","first_wrong","total","wrong":[ids],"after_correction":{"correct","total","rounds"},"answers":{"first","final","rounds"},"started_at","submitted_at","completed_at","key"}`
- 今日檢查（Roby 勾「確認」或家長簽名時送出，同一天只留最新一筆在佇列）：`{"subject":"checklist","date","by":"confirm|sign","items":[{"section","text","checked","score","focus":{"start","end","minutes"}}],"done","total","contact_book":"signed|missing|none","note","confirmed","signed","signed_at","sent_at","key"}`

## 角色與頭像（換圖不用改程式）
`data/config.json` 的 `characters.chinese / english / monkey / cat`：`{"name":"李清照","avatar":"assets/t-zh.webp","full":"（可選）全身圖，顯示在該科頁首"}`。英文老師已用正式圖 `assets/english-teacher-face.webp`（對話頭像）與 `english-teacher-full.webp`（頁首）；國文老師仍為暫用圖。
換圖：把圖片放進 `assets/`，改 config 的 `avatar` 路徑（與 `name`）即可。目前老師頭像是暫用圖，Doc 之後會換正式圖。
台詞：各科 JSON 的 `dialog`（greet、present、correct[]、wrong[]、hint、submit、done），沒填用內建預設。

## 今日檢查格式（data/checklist）
```json
{"date":"2026-10-23","warning":["明天截止：…"],
 "plan":[{"text":"08:00 理化","timer":true}],
 "daily":[{"pair":["聯絡簿已簽","聯絡簿未帶"]},{"text":"英文大師","subject":"english","label":"小測驗"},{"text":"國文小測驗","subject":"chinese"}],
 "weekTodo":[{"text":"國文家教功課","due":"10/24（六）前"}],
 "note":"✏️ Roby 自己勾：…"}
```
- `due` 可寫「10/24（六）前」或 `YYYY-MM-DD`（自動顯示成 10/24（六）前），紅字。
- 有 timer 的項目有「開始」鍵（25 分專注＋5 分休息），顯示「開始 HH:MM｜結束 HH:MM｜共 N 分」。
- 為了和舊版 localStorage 對齊，順序固定為：plan → daily（pair 算兩格）→ weekTodo → 備註 → Roby 確認。

## 每日排程（v2）
```bash
cd /workspace/roby/app && git pull --rebase -q
python3 build.py new $(TZ=Asia/Taipei date +%F)   # 產生草稿，再編輯 plan/warning/weekTodo
python3 build.py                                  # 驗證＋更新 sw.js 版本
git add data/checklist sw.js && git commit -qm "checklist $(TZ=Asia/Taipei date +%F)" && git push -q
```
週日另寫 `data/weekly/<週一>.json`（`week_start, base 累計點數, overview, days[], homework[], noteSubjects, pending[], highlights[], next[], parentNote`），每月 1 日寫 `data/monthly/YYYY-MM.json`（與舊月報 JSON 相同，可加 `scores[]`、`daily.contactMissing`）。
測試：`python3 /workspace/roby/test_v2.py`（headless Chromium、iPad 820×1180，含 webhook 模擬）。

---
（以下為舊版說明，舊版頁面在 legacy.html / weekly.html / monthly.html，用 build_legacy.py 產生）

# Roby 今日檢查 PWA

- Repo：laskin77/r-75qlms0vgufz2kwa（https://github.com/laskin77/r-75qlms0vgufz2kwa）
- 網址：https://laskin77.github.io/r-75qlms0vgufz2kwa/ （noindex，請勿公開分享）
- 時區：Asia/Taipei

## 檔案
- （舊）`legacy.html`：今日檢查（由 `../checklist_template.html` 產生）← **每天更新**
- `weekly.html`：週報（由 `../weekly_template.html` 產生）← **每週日更新**
- `build.py`：把範本加上 PWA head、iPad 版面（最大寬 820px、大字大勾選框）、上方切換列、localStorage 保存（key `roby-check-YYYY-MM-DD`），並更新 `sw.js` 版本號
- `focus.js`：「戒除拖延」功能（由 build.py 注入 index.html）。範本中 `data-timer` 的卡片（讀書計畫進度、本週待完成）每項會有「開始」鍵、25 分專注＋5 分休息倒數（時間戳計算、同時只一個，存在 `roby-timer`），每項固定顯示「開始 HH:MM｜結束 HH:MM｜共 N 分」（存於每日 key 的 `t`：s 第一次開始、e 最後結束、acc 累計專注毫秒、run 進行中起點；扣除暫停與休息），並寫入 PNG。**每日改範本時請保留卡片上的 `data-timer` 與 save() 裡的 `l.dataset.log`。**
- `sw.js`（network-first，離線顯示快取）、`manifest.webmanifest`、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png`、`.nojekyll`：通常不用動

## 每日 9:00（Asia/Taipei）更新步驟
1. 修改 `/workspace/roby/checklist_template.html` 成當天內容（標題日期、項目、存檔檔名 `Roby檢查_MMDD.png` 等）。
   週日另外修改 `/workspace/roby/weekly_template.html`（數據、腳本中的 `var base=` 累計點數）。
2. 產生並推送：
```bash
cd /workspace/roby/app
git pull -q
python3 build.py $(TZ=Asia/Taipei date +%F)
git add -A && git commit -qm "update $(TZ=Asia/Taipei date +%F)" && git push -q origin main
```
3. 約 1–2 分鐘後確認：`curl -s -o /dev/null -w '%{http_code}\n' https://laskin77.github.io/r-75qlms0vgufz2kwa/` 應為 200。

註：勾選狀態只存在 Roby 的 iPad（localStorage，依日期分開），換新的一天會是空白。

## 視覺主題
- `theme.css`：紙感手繪主題（4 色：墨棕 #5b4636、草綠 #6b7f4e、暖棕 #b5835a、米紙 #f3eee2）＋緊湊尺寸，由 build.py 內嵌到兩頁。
- 圖：`monkey-hero.webp`（頁首）、`cat-foot.webp`（頁尾）、`paper.jpg`（紙紋）、`monkey-head.png`（全部勾完的鼓勵＋App 圖示）。存 PNG 也會畫入紙紋、猴子與貓。
- 原圖在 /workspace/roby/monkey.jpg、cat.jpg。

## 截止日紅字
「本週待完成」每項的截止日請包成 `<span class="due">10/22（四）前</span>`，例：
`<label><input type="checkbox"><span>寰宇數學回家功課 — <span class="due">10/22（四）前</span></span></label>`
（build.py 也會自動把「— M/D（X）前」補成 due span。）網頁顯示磚紅 #c0392b 粗體，勾選後變灰；PNG 也畫紅字。

## 月報 monthly.html（每月 1 日更新上個月）
- 範本：`/workspace/roby/monthly_template.html`。只需改檔案中 `<script id="data" type="application/json">` 的 JSON：
  `sample`（true 會顯示紅色「範例資料」標示，真實資料請設 false）、`year`/`month`、`plan{done,total}`、
  `weeks[{label,done,total}]`、`daily{days,contact,english}`、`homework[{name,ontime,late}]`、
  `focusMinutes{科目:分鐘}`（來自每日 PNG 的「共 N 分」累加）、`notes[{subject,count,points}]`、`pointsTotal`（累計點數）、`highlights[]`、`advice[]`。
- 月份標題、日期範圍、百分比、長條圖、時數由頁面自動計算。
- 產生：`python3 build.py` 會同時產生 index.html、weekly.html、monthly.html（頁首切換列「今日檢查｜週報｜月報」，月報頁首用貓插圖），再 commit/push。

## 小時鐘（clock.js，由 build.py 注入 index.html）
- 頁首右上小時鐘：台北時間 HH:MM＋秒＋手繪小指針，純顯示（點了無動作）。不畫進 PNG。
- 鬧鐘功能已依 Doc 要求移除（笑臉鬧鐘捷徑按鈕、「第一次使用？」說明、App 內鬧鐘與響鈴彈窗）。
  備份在 `/workspace/roby/backup_alarm/`（`clock.js` 鬧鐘完整版、`alarm.webp`、`shortcut_steps.md`；原圖 `/workspace/roby/alarm.jpg`）。
  要恢復：把備份的 clock.js 與 alarm.webp 複製回 app/ 再 build（theme.css 的鬧鐘樣式仍保留）。

## 英文大師成績
範本「英文大師」項目內有 `<span class="score" data-score="" data-label="小測驗"></span>`。排程把分數填進 `data-score`（例 `data-score="92"`）；空字串顯示「小測驗 —」（尚無成績）。
標籤顏色自動：≥90 草綠、70–89 暖棕、<70 磚紅、無成績灰。PNG 也會畫同色圓角標籤。（score.js 由 build.py 注入）

## 週報家長簽名
週報範本最下方（存 PNG 按鈕前）有 `<div class="card" id="sigcard">` 家長手指簽名框（canvas `#wsig`、清除鈕、簽名日期）。簽名存 localStorage `roby-weekly-sig-<該週週一 YYYY-MM-DD>`（含簽名圖與簽名日期），存 PNG 時一併畫入（清除鈕隱藏）。**週日排程更新 weekly_template.html 時請保留整個 sigcard 區塊**；build.py 會檢查，缺少時中止。

## 聯絡簿已簽／未帶（二擇一）
每日必做中「聯絡簿已簽」與「聯絡簿未帶」放在同一列 `<div class="pair">`，兩個勾選框都帶 `data-excl="cb"`（excl.js 互斥：點一個另一個自動取消，可都不選）；「未帶」的 label 有 `class="alt"`，內文 `<span class="tagred">聯絡簿未帶</span>`，勾選時為磚紅實心小標籤，PNG 亦畫紅標籤。不計入「全部完成」判斷。狀態存同一個 `roby-check-YYYY-MM-DD`。**每日排程請保留這段 pair 結構。**
週報／月報排程可從每日 PNG 統計：聯絡簿已簽天數、**聯絡簿未帶天數**（月報 JSON 可加 `daily.contactMissing`）。
