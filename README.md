# Roby 今日檢查 PWA

- Repo：laskin77/r-75qlms0vgufz2kwa（https://github.com/laskin77/r-75qlms0vgufz2kwa）
- 網址：https://laskin77.github.io/r-75qlms0vgufz2kwa/ （noindex，請勿公開分享）
- 時區：Asia/Taipei

## 檔案
- `index.html`：今日檢查（由 `../checklist_template.html` 產生）← **每天更新**
- `weekly.html`：週報（由 `../weekly_template.html` 產生）← **每週日更新**
- `build.py`：把範本加上 PWA head、iPad 版面（最大寬 820px、大字大勾選框）、上方切換列、localStorage 保存（key `roby-check-YYYY-MM-DD`），並更新 `sw.js` 版本號
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
