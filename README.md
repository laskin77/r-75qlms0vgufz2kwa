# Roby 今日檢查 PWA

- Repo：laskin77/r-75qlms0vgufz2kwa（https://github.com/laskin77/r-75qlms0vgufz2kwa）
- 網址：https://laskin77.github.io/r-75qlms0vgufz2kwa/ （noindex，請勿公開分享）
- 時區：Asia/Taipei

## 檔案
- `index.html`：今日檢查（由 `../checklist_template.html` 產生）← **每天更新**
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

## 小時鐘與鬧鐘（clock.js，由 build.py 注入 index.html）
- 頁首右上：紅色笑臉小鬧鐘圖示按鈕 `alarm.webp`（88px、輕微搖晃，主要）＝開啟 iPad 鬧鐘，連到 iOS 時鐘 App 的 `clock-alarm://`，約 0.9 秒內沒離開頁面就改試 `clock-timer://`；打不開就無動作。系統鬧鐘鎖屏也會響。**此 URL scheme 非 Apple 官方文件記載，需在 iPad 實測。**
- 下方小時鐘（台北時間 HH:MM＋秒＋手繪小指針）：點開是 App 內鬧鐘（次要），可多個（時間＋標籤）、開關、刪除，存在 localStorage `roby-alarms`（不跟日期，每天沿用）；響鈴為 Web Audio 重複到按「關閉」，可「稍後 5 分鐘」。需開著 App 才會響；開啟設定時順便解鎖 iOS 音效。
- 鬧鐘不會畫進 PNG。
