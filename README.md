# Member Dashboard

會員 / 訂閱管理 dashboard（trading-signal service：Vantage / TradingView / Telegram）。

## ⚠️ 私隱提醒
`sheet.csv`、`members.json`、`index.html` 含有真實會員嘅 email、姓名、Telegram ID、Vantage 戶口號碼。
**只可以放 private repo，唔好設做 public。**

## 用法
直接用瀏覽器打開 `index.html` 就睇到（資料已經 embed 入去，唔使 server）。

## 重新生成（sheet 有更新時）
```
node parse.mjs   # sheet.csv -> members.json
node build.mjs   # members.json -> index.html
```

## 檔案
- `index.html` — 完整 app（deliverable）
- `sheet.csv` — Google Sheet 匯出嘅原始資料
- `parse.mjs` — CSV 清理 + 分類成 JSON
- `build.mjs` — 將 JSON embed 入 HTML
- `members.json` — 中間資料
