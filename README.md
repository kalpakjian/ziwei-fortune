# 紫微斗數 · 命盤解讀

用 Node.js + [iztro](https://github.com/SylarLong/iztro) 排盤，再用自寫的規則引擎產生可閱讀的解讀。
輸入出生資料後，會得到完整的十二宮命盤、生年四化、大限／流年／小限，以及性格、事業、財運、感情、健康與格局分析。

> 這是**娛樂與自我覺察**用的程式，不是命運判決書。所有文字都來自規則組合，沒有接 AI、也不會上傳資料到第三方。

**線上版：<https://kalpakjian.github.io/ziwei-fortune/>**（Hexo → GitHub Pages，純前端）

本專案是獨立的 git repository：`src/`（排盤與解讀引擎）、`public/`（前端）與
`scripts/`（建置與測試）都在版控內；建置產物 `docs/` 與執行期日誌則被 `.gitignore` 排除。

## 功能

- **排盤**：國曆／農曆（含閏月）、13 個時辰、男／女，1900–2100 年。
- **命盤**：4×4 十二宮方格、十四主星亮度、輔星／煞星、生年四化（祿權科忌）、身宮標記、大限起訖。
- **解讀**：命宮性格、身宮、三方四正、12 宮逐宮說明、五個面向分數。
- **格局**：紫府同宮、殺破狼、機月同梁、陽梁昌祿、巨日對照、火貪、鈴貪、羊陀夾命等 20+ 條規則。
- **運限**：目前大限、指定流年、小限、大限四化與流年四化落宮、12 個大限時間軸。
- **介面**：Qwen-Image 2.1 生成的星盤背景（深色主題）、墨金／淺色主題、手機可讀、可列印成 PDF、宮位三方四正互動高亮。
- **CLI**：終端機直接排盤，適合快速對盤或批次檢查。

## 快速開始

需求：Node.js 18 以上（開發時使用 v24）。

```bash
cd ziwei-fortune
npm install
npm start
```

開啟 <http://localhost:5199>，按「填入範例」或輸入自己的生日即可。

Windows 也可以直接雙擊 **`start.bat`**（會自動安裝依賴、開瀏覽器、啟動伺服器）。

### 用 CLI 排盤

```bash
node cli.js --date 1990-5-17 --time 6 --gender 女 --name 小明 --year 2026
node cli.js --lunar --date 1990-4-23 --leap --time 0 --gender 男
node cli.js --help
```

`--time` 是時辰索引：`0` 早子、`1` 丑、`2` 寅 … `6` 午 … `11` 亥、`12` 晚子。

## 視覺資產（雙主題背景圖）

深色與淺色各有一張 **Qwen-Image 2.1** 在本機 ComfyUI 生成的背景，不是圖庫圖：

| 主題 | 檔案 | 尺寸 | 大小 | 種子 |
| --- | --- | --- | --- | --- |
| 深色（二十八宿星盤） | `public/bg-ziwei.jpg` | 1536×864 | 109 KB | 7312 |
| 深色手機 | `public/bg-ziwei-mobile.jpg` | 960×540 | 38 KB | 7312 |
| 淺色（古書／八卦／太極） | `public/bg-ziwei-light.jpg` | 1250×864 | 56 KB | 7403 |
| 淺色手機 | `public/bg-ziwei-light-mobile.jpg` | 960×664 | 34 KB | 7403 |

- 生成紀錄：`browser/prompts/backgrounds.json`（25 steps、cfg 2.5）
- Prompt：`browser/prompts/background-dark.txt`、`background-light.txt`
- 流程：每個主題先出 3 個種子，目視確認無可讀文字後選定；淺色版裁掉右側紙卷、提高墨線對比（contrast 1.32），古書區再做局部柔化（12px blur），讓它像水墨暈染而不是半截書。
- 原始 PNG 與候選圖在 `_art/`（已 gitignore），不進版控。
- CSS 在 `public/styles.css` 的 `body::after`／`body.light::after`；用同色漸層壓在圖片左側，確保標題對比。列印時兩張都會隱藏。

### 淺色模式背景圖的透光處理

淺色底圖本身是一張偏白的古書／八卦圖，若上層元件不透明就會被整片蓋死，因此：

- `body.light::after` 用**縱向**遮罩（不是徑向），讓圖片在整個視窗維持亮度；手機版另用較陡的同色漸層，標題區乾淨、下半部看得到圖。
- 淺色模式的 `.panel`、`.pattern-card`、`.score-inner`、`.tabs`、`.palace-cell`、`.chart-center`、`.palace-card`、`.fortune-card` 都改成**半透明**（0.7–0.9 不透明度、backdrop blur 6–8px），背景圖才透得出來。
- `public/ui.js` 會在切換主題前先 `decode()` 背景圖（滑鼠移上按鈕就預載），避免換圖時背景「消失一下又跳出來」；`public/index.html` 也在 `<head>` 依 localStorage 預載淺色底圖。

### 避免瀏覽器「自動深色模式」把整頁反相

Chrome／Edge 的「自動深色模式」（或「深色網站」）會把淺色網站整頁反相成棕褐色，
本頁的淺色底圖是米白紙面，被反相後會跟著變黑、整個消失在背景裡，F5 還會閃一下。

Chrome 官方（[Auto Dark Theme](https://developer.chrome.com/blog/auto-dark-theme)）提供的退出方式是宣告 `color-scheme: only light`：

```html
<meta name="color-scheme" content="only light" />
```

```css
:root { color-scheme: only light; }
```

- meta 寫在 `<head>`：**完全不套用**自動深色模式，也就不會有「閃爍」。
- CSS 寫在 `:root`：即使瀏覽器忽略 meta 也能逐元素退出。
- 網站自己的深／淺主題是純 CSS，不受影響；`only light` 唯一的副作用是捲軸／原生下拉選單會變淺色，用 `scrollbar-color` 補回深色主題的外觀。

### 避免 Dark Reader 改寫頁面

Dark Reader 是瀏覽器擴充功能（不是瀏覽器內建），會自己再疊一層暗色樣式。
本站已有完整的深／淺主題，若 Dark Reader 也插一腳，命盤配色與底圖會失真。
在 `<head>` 宣告鎖定即可讓它略過本頁：

```html
<meta name="darkreader-lock" content="true" />
```

Dark Reader 的原始碼（v4.9.133，`src/inject/dynamic-theme/index.ts`）判定方式是：

```ts
function isDRLocked() {
    return document.querySelector('meta[name="darkreader-lock"]') != null;
}
```

重點：

- **只比對 `name`，不檢查 `content` 的值**，所以 `content="true"` 只是相容性保險。
  社群回報（[darkreader#14958](https://github.com/darkreader/darkreader/issues/14958)）曾指出
  動態插入的標籤在某些版本失效、改成 `content="true"` 後恢復；加上 `content` 兩種情況都能命中。
- **必須寫在 HTML 原始碼的 `<head>`**，不要用 JS 動態插入：
  Dark Reader 在 `document.head` 就緒時就會檢查（`ready()` → `isDRLocked()`），
  動態插入會晚一步，造成「先被改寫、再被還原」的閃爍。
- 這是 Dark Reader 的約定，不是 W3C 標準；使用者仍可在擴充功能裡手動強制啟用。
- 搭配 `color-scheme: only light`（上一節）一起用：前者擋 Dark Reader，後者擋 Chrome 自動深色模式。

### 驗證工具

```bash
node scripts/measure-bg.mjs <網址>          # 背景可見比例（開／關 body::after 逐像素比對）
node scripts/diag-texture.mjs <網址>        # 底圖區域紋理對比（標準差），越大越看得出來
```

`measure-bg.mjs` 會印出首頁與結果區的可見比例（值越高代表背景越明顯）；
`diag-texture.mjs` 加 `FORCE_DARK=1` 環境變數可模擬 Chrome 自動深色模式，檢查底圖被反相後是否還留得住痕跡。

要換背景：改對應的 prompt、用 `qwen_image.py --prompt-file ... --seed 73xx --candidates 3` 重出，替換 JPEG 後執行 `npm run build`。

## 靜態版與 GitHub Pages

`npm start` 跑的是**動態版**：Express 提供頁面與 `POST /api/chart`，排盤在 Node 端執行。
如果要放 GitHub Pages（只能託管靜態檔、不能跑 Node），改用靜態建置：

```bash
npm run build      # 產生 docs/：純前端版，排盤與解讀都在瀏覽器內計算
npm run preview    # http://localhost:5200/ziwei-fortune/（模擬 Pages 子路徑）
npm run test:static
```

原理：用 esbuild 把 `src/` 的排盤、解讀、運限打包成 `docs/engine.js`；頁面若偵測到
`window.ZiweiEngine`，就直接在瀏覽器計算，**不呼叫任何 API、生日不會離開瀏覽器**。

實測大小：

| 項目 | 大小 |
| --- | --- |
| `docs/` 全部 | 872 KB |
| `engine.js`（含 iztro） | 566 KB（gzip 165 KB） |
| 背景圖（深／淺 × 桌機／手機） | 236 KB |
| HTML／CSS／前端 JS | 約 67 KB |

GitHub Pages 的限制是單檔 100 MB、站台 1 GB、每月約 100 GB 流量；這個站約 0.63 MB，遠低於限制。

部署步驟（若要讓本 repository 自己當 GitHub Pages）：

1. 先 `npm run build` 產生 `docs/`，再把它一起提交（`docs/` 預設被 `.gitignore` 排除，
   要用 `git add -f docs/` 強制加入）。
2. GitHub → **Settings → Pages → Build and deployment**。
3. Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 **`/docs`**，按 Save。
4. 等 1–2 分鐘，開啟 `https://<你的帳號>.github.io/<repo>/`。

> **本站實際上不是這樣發佈的**：`docs/` 是被 `.gitignore` 排除的建置產物，
> 線上版本由下方的 Hexo 流程發佈。保留這段是給想自己架 GitHub Pages 的人參考。

因為所有資源都用相對路徑（`./styles.css`、`./engine.js`），放在帳號根目錄或專案子路徑都能運作。

### 用 Hexo 發佈（本站目前的方式）

這個站是掛在既有的 Hexo 部落格 `C:\Users\princ\blog` 底下，路徑 `/ziwei-fortune/`：

```bash
npm run build         # 1. 產生 docs/
npm run sync:hexo     # 2. 複製到 blog/source/ziwei-fortune/
cd C:\Users\princ\blog
git add source/ziwei-fortune
git commit -m "update(ziwei): 更新命盤解讀"
git push              # 3. push main → GitHub Actions 建置並部署 Pages
```

Hexo 端只需做過一次設定：`_config.yml` 的 `skip_render` 加入 `ziwei-fortune/**`（避免主題改寫 HTML），`_config.fluid.yml` 導覽加入連結。`sync:hexo` 的目的地可用 `HEXO_SOURCE` 環境變數覆寫。

> `.nojekyll` 不需要：此站是用 GitHub Actions 的 Pages artifact 部署，不經過 Jekyll。
> 上游的 `kalpakjian/kalpakjian.github.io` 只收 `source/ziwei-fortune/` 的**建置產物**，
> 引擎原始碼保存在本 repository，兩邊各司其職。

| 比較 | 動態版（`npm start`） | 靜態版（`docs/`） |
| --- | --- | --- |
| 主機 | Node（本機／Render／Railway／VPS） | GitHub Pages、任何靜態空間 |
| 成本 | 需要伺服器 | 免費 |
| 隱私 | 本機伺服器，資料不離開電腦 | 全部在瀏覽器計算 |
| 擴充 | 可加會員、資料庫、AI 解讀 API | 只能前端功能 |

## API

`POST /api/chart`

```json
{
  "name": "王小明",
  "gender": "女",
  "calendar": "solar",
  "year": 1990,
  "month": 5,
  "day": 17,
  "timeIndex": 6,
  "isLeapMonth": false,
  "fixLeap": true,
  "fortuneYear": 2026
}
```

回傳三段資料：

| 欄位 | 內容 |
| --- | --- |
| `chart` | 正規化後的命盤：`meta`、12 個 `palaces`（含 grid 座標、主星／輔星、四化、大限） |
| `reading` | `summary`、`personality`、`palaces`、`dimensions`、`patterns`、`notes` |
| `fortune` | `decadal`、`yearly`、`age`、`timeline`（12 個大限） |

其他端點：`GET /api/health`、`GET /api/time-options`。

錯誤一律回傳 `{ "error": "訊息" }`，並使用 HTTP 400。

## 專案結構

```
server.js              Express 伺服器與 API
cli.js                 終端機排盤
src/
  chart.js             iztro 排盤封裝、輸入驗證、輸出正規化
  index.js             cast()：排盤 + 解讀 + 運限
  ctx.js               宮位查詢（三方四正、夾宮、星曜搜尋）
  scoring.js           宮位分數、宮位解讀文字
  interpret.js         整體解讀、性格、格局、五面向
  fortune.js           大限／流年／小限與時間軸
  mutagens.js          四化落宮對照
  knowledge.js         知識庫匯總
  data/
    major-stars.js     十四主星性質與五個面向文字
    minor-stars.js     輔星、煞星、雜曜
    palaces.js         地支、宮位、四化、亮度
    patterns.js        格局規則與五面向設定
public/
  index.html           單頁介面
  styles.css           版型、表單、主題
  chart.css            命盤方格、列印樣式
  render.js            命盤 DOM
  interactions.js      三方四正高亮、宮位詳情
  reading.js           總覽、十二宮卡片
  reading2.js          格局、運限、時間軸
  form.js              表單選項與資料收集
  ui.js                主題、分頁、列印
  app.js               請求與畫面組裝（有 engine 時走純前端）
browser/
  main.js              靜態版進入點，打包成 window.ZiweiEngine
docs/                  靜態建置產物（gitignored，由 npm run build 產生）
scripts/
  build-static.mjs     產生 docs/
  static-server.mjs    以子路徑預覽 docs/
  static-test.mjs      驗證靜態版不呼叫 API、資源無 404
  api-test.mjs         後端 API 測試
  smoke.mjs            Playwright 端對端測試（含截圖）
```

## 解讀引擎怎麼運作

1. **排盤**：交給 `iztro`（`astro.bySolar` / `astro.byLunar`，語言 `zh-TW`），確保十二宮、主星、四化、大限的計算口徑一致。
2. **宮位分數**：主星亮度（廟旺得利平不陷）、輔星吉凶、四化各自加權，自己佔 60%、三方四正平均佔 40%，再用 `tanh` 壓縮到 5–96 分。
3. **逐宮文字**：依宮位選取主星對應的「性格／事業／財運／感情／健康」段落；空宮借對宮；再補四化、吉星、煞星提示。
4. **格局**：以命宮三方四正與夾宮條件比對規則庫，回傳命中的格局與說明。
5. **運限**：用 `astrolabe.horoscope()` 取得大限、流年、小限，將大限／流年四化星回查本命宮位，換算成「大限財帛」「流年遷移」等落點，再調整當年分數。

## 測試

```bash
# 先讓伺服器跑著（另開一個終端機執行 npm start）
npm test          # 後端 API：正常盤、早／晚子時、農曆閏月、錯誤輸入
npm run test:e2e  # 真實 Chromium：排盤、宮位互動、分頁、流年切換、列印、手機版

npm run build && npm run preview   # 另一個終端機
npm run test:static                # 靜態版：0 次 API 呼叫、子路徑資源、流年重算
```

`test:e2e` 會把截圖存到 `shots/`（已列入 `.gitignore`）。若自動找不到 Chromium，可設定 `CHROME_PATH` 指向 `chrome.exe`。

## 已知限制

- **真太陽時**未實作。程式直接用輸入的鐘錶時間排盤；若你要用真太陽時，請先自行換算經度差與均時差。
- **閏月**採 `iztro` 的 `fixLeap`（預設下半月算下個月）。不同流派對閏月與晚子時的口徑不同，若拿來對盤，請先確認設定一致。
- **早子／晚子**以 `timeIndex` 0 與 12 區分，但不會自動把晚子時的日期加到隔天。
- **虛歲邊界**：流年虛歲以「流年 + 出生月日」代入 `horoscope()` 計算，生日前後可能與其他流派差一歲。
- **分數**是程式自訂的相對指標（5–96），不是標準化量表，也不宜跨命盤比較。
- 解讀文字是**通則**，尚未依性別、年齡、大限疊盤與流年逐月做完整權重；格局也只收錄常見的 20 餘條。
- 未實作合盤、流月／流日／流時。`iztro` 本身有提供，若要擴充可從 `horoscope()` 的 `monthly` / `daily` / `hourly` 著手。

## 免責聲明

命理是文化與自我對話的工具，不是科學預測。本程式輸出的內容不構成醫療、法律、投資或婚姻建議；重大決定請回到現實條件與專業意見。

## 授權與致謝

- 本專案程式碼：MIT（見 `LICENSE`）。
- 排盤引擎：[iztro](https://github.com/SylarLong/iztro)，MIT。
- 參考專案：[Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)（Next.js 版排盤引擎與資料集）。本專案未使用該專案未開源的斷語庫、AI prompt 或商業版介面；所有解讀文字與規則為本專案自行撰寫。若你要商業化，請自行確認星曜資料、古籍原文與文本的授權範圍。

