# Roby 今日檢查 PWA

- Repo：laskin77/r-75qlms0vgufz2kwa（https://github.com/laskin77/r-75qlms0vgufz2kwa）
- 網址：https://laskin77.github.io/r-75qlms0vgufz2kwa/ （noindex，請勿公開分享）
- 時區：Asia/Taipei

## 檔案
- `index.html`：今日檢查（由 `../checklist_template.html` 產生）← **每天更新**
- `weekly.html`：週報（由 `../weekly_template.html` 產生）← **每週日更新**
- `build.py`：把範本加上 PWA head、iPad 版面（最大寬 820px、大字大勾選框）、上方切換列、localStorage 保存（key `roby-check-YYYY-MM-DD`），並更新 `sw.js` 版本號
- `focus.js`：「戒除拖延」功能（由 build.py 注入 index.html）。範本中 `data-timer` 的卡片（讀書計畫進度、本週待完成）每項會有「開始」鍵、25 分專注＋5 分休息倒數（時間戳計算、同時只一個，存在 `roby-timer`），開始/完成時間存於每日 key 的 `t` 欄位並寫入 PNG。**每日改範本時請保留卡片上的 `data-timer` 與 save() 裡的 `l.dataset.log`。**
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
