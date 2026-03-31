# Claude Code 最佳實踐

你問 Claude 一個函式是怎樣運作的。它洋洋灑灑解釋了一大段，聽起來完全合理。

你根據它說的繼續做了一個小時。

然後你發現它說的是錯的。

---

又或者這個情況：你改了一個函式，Claude 幫你完成了，測試也通過了，你也 ship 了。三天後 code review，有人指出有四個地方都在呼叫這個函式，全部壞掉了。Claude 從來沒有提醒你。你也從來沒有想到要問。

這不是偶發的。每次用 Claude Code 做真實專案都會遇到。根源只有一個：**Claude 沒有辦法在你的程式碼庫裡導航。** 讀得太少就猜測；讀得太多又把 token 全燒在找路上，根本沒辦法做正事。

這個 repo 解決的就是這個問題。

---

## 解決方法：給 Claude 一套導航系統

核心概念很簡單：Claude 不只需要原始碼，它需要一套導航系統——知道要去哪裡找、怎樣有效率地到達、以及各個模組之間如何連接。

三個部分協同運作：

---

### AI_INDEX.md — 地圖

**沒有它會發生什麼：**

每次開新的 session，你要花 10 到 15 分鐘重新幫 Claude 定位。「auth 邏輯在這裡、API routes 在那裡、資料庫 model 在...」Claude 問出根本不需要問的問題，讀了不相關的檔案，然後對它根本沒開過的程式碼侃侃而談。

**它做什麼：**

在每個 repo 的根目錄放一個檔案，Claude 一開始就先讀它。這個檔案描述各個功能域的位置：入口檔案、搜尋關鍵字、測試路徑，以及最關鍵的——各域之間如何連接。

它不是設計文件，不解釋程式碼怎麼運作。它是機場的指示牌：12 號登機口往這走。僅此而已。

```markdown
# AI_INDEX.md

## 使用說明
- 僅作導航用途，不是事實來源。
- 做出任何判斷前，請閱讀實際原始碼。

### 規則評估
- 入口：src/rule_evaluator.py
- 搜尋關鍵字：evaluate_rule, ActionExecutor
- 測試：tests/test_rule_evaluator.py
- 連接至：
  - 內容層 — 經由 ActionExecutor.execute()
  - API 層 — 經由 POST /api/evaluate（src/api/routes.py）
```

`連接至` 這個欄位是關鍵。當你要追蹤一個改動的影響範圍時，這些連接告訴 Claude 接下來要去哪些域檢查——而不需要把中間所有檔案都讀一遍。

**怎樣維持它的健康：** 不超過 250 行，每個功能域 4 到 8 行，只寫檔案路徑與搜尋關鍵字。一旦開始出現解釋性文字，或「通常」、「大概」這類字眼——就重寫成指針格式。否則 Claude 會拿這些描述直接回答問題，而不是去讀原始碼，這正是自信型 hallucination 的來源。

參考：[`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md)

---

### LSP — 必裝工具

**沒有它會發生什麼：**

你請 Claude 找出某個函式被呼叫的所有地方。Claude 用 grep 搜尋。grep 是字串比對——它會把這個名稱出現過的每一個地方都找出來：注解、恰好包含這個字串的變數名、以及毫不相關的檔案。你拿到 40 個結果，其中 15 個是雜訊。Claude 把它們全部讀一遍，token 預算燒掉一半，正事還沒開始。

**它做什麼：**

LSP（語言伺服器協議）直接詢問語言的型別檢查器。它理解這個符號「是什麼」，而不只是「字串在哪裡出現」。結果是語義層面的精確比對：就是這些呼叫點，沒有其他的。

| | grep | LSP findReferences |
|---|---|---|
| 速度 | 基準 | 快 900 倍 |
| Token 消耗 | 高 | 低 20 倍 |
| 準確度 | 字串比對，有誤報 | 語義比對，零誤報 |

在 `.claude/settings.json` 啟用：
```json
{ "env": { "ENABLE_LSP_TOOL": "1" } }
```

安裝對應語言的伺服器：
```bash
pip install python-lsp-server                         # Python
npm install -g typescript-language-server typescript  # TypeScript
go install golang.org/x/tools/gopls@latest            # Go
```

---

### 兩個技能（Skills）

**`/investigate-module`**

**沒有它會發生什麼：**

你問 Claude 某個 module 的行為。Claude 給出詳盡的解釋，聽起來完全正確。但其中有一半是錯的——Claude 用訓練資料的記憶填補了它沒有讀過的部分。等你發現，你已經在錯誤的假設上蓋了半座房子。

**它做什麼：**

在給出任何答案前，強制執行有根據的調查：讀 AI_INDEX 找到對應的域 → 用 grep/LSP 定位確切的檔案與函式 → 只讀相關段落（指定行數範圍，不是整個檔案）→ 明確說明讀了什麼，讓你可以驗證。找不到的東西就說「不確定」，不猜測。

在這個 session 中，每當要對一個你還沒看過的 module 做出判斷之前，先用它。

---

**`/trace-impact`**

**沒有它會發生什麼：**

你修改了一個函式，測試通過，上線了。然後你發現有三個服務依賴這個函式，一個前端型別依賴它的回傳格式，一個測試 mock 硬編碼了它的舊行為。這些都不明顯，Claude 沒有提醒你，因為你沒有問，而 Claude 不知道自己不知道這些關聯。

**它做什麼：**

在你動手之前，先把所有會受影響的地方找出來。它用廣度優先搜尋（BFS）系統地遍歷你的程式碼庫：

1. **Level 0** — 你要改動的那個符號
2. **Level 1** — 所有直接呼叫它的地方（透過 LSP findReferences，語義精確比對，不是 grep）
3. **Level 2** — 呼叫那些呼叫者的地方
4. **跨域路徑** — 查 AI_INDEX 的 `連接至` 欄位，捕捉跨越 module 邊界的路徑
5. **受影響的測試** — 找出涵蓋到上述任何位置的測試

為什麼用廣度優先？因為你需要先看清楚所有直接影響，再往下追第二層、第三層。系統性的——不會因為恰好先追了某條路徑而漏掉其他地方。

到達外部 API 邊界或域邊界時停止，不會無止境地往下追。

結果是：在你寫下第一行改動之前，你就知道哪些地方必須改、哪些地方需要確認、哪些測試要跑。

每次非瑣碎的改動之前，先用它。

---

### 三者如何協作

```
任務：修復 rule_evaluator.py 中的一個 bug

1. /trace-impact rule_evaluator.py:evaluate_rule
   → 動手前先知道完整的影響範圍

2. /investigate-module 查詢需要理解的部分
   → 有根據的事實，有來源，不是猜測

3. 進行修改
   → 你已經知道其他什麼地方需要一起更新
```

---

## CLAUDE.md 配置

### 問題：「小心一點」沒有用

你在 CLAUDE.md 裡加了一條規則：「回答前請先核對原始碼。」Claude 兩條訊息後就忽略了。你加粗，還是一樣。你放到最前面，好一點，但仍不穩定。

這不是 Claude 故意的。Anthropic 在載入你的 CLAUDE.md 時會附加這句話：「這段 context 可能與當前任務相關，也可能無關。」在 context 壓力下，markdown 標題的優先度會下降，規則雖然存在，但在競爭中輸了。

**真正有效的做法：** XML 標籤。它是 Claude 訓練資料中的高優先度結構，在 context 壓力下的穩定性遠高於任何 markdown 格式。

```xml
<investigate_before_answering>
不要對你還沒有開啟過的程式碼做出推測。
先讀 AI_INDEX.md——僅作導航用途，不是事實來源。
在讀取任何檔案前，先用 grep/LSP 定位確切的位置。
只讀相關段落，使用行數範圍，不是整個檔案。
說明你讀了什麼：「根據 src/foo.py:bar()...」
不確定時：說「不確定」，不要猜測。
每個檔案只讀一次，不重複讀取。
</investigate_before_answering>
```

### 指令配額

Claude 大約有 150 到 200 個指令空間，系統 prompt 已佔用約 50 個。CLAUDE.md 裡的每一個 bullet 就是一個空間。超過上限後，所有規則同時降質——不只是後面的被忽略，是全部一起變差。

CLAUDE.md 控制在 200 行以內。把最有價值的內容放在前面：能預防真實 bug 的具體陷阱，而不是泛泛的行為指引。

### 硬性規則放 settings.json，不是 CLAUDE.md

CLAUDE.md 是建議性質的，在足夠大的壓力下可能被忽略。`settings.json` 的 deny rules 無法被覆蓋：

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(rm -rf*)"
    ]
  }
}
```

如果你發現自己在 CLAUDE.md 裡寫「絕對不要做 X」，把它移到 `settings.json` deny 裡。

---

## 自主性規則

**問題：** Claude 在編輯一個檔案之前問你「可以繼續嗎？」在跑測試之前問，在 grep 之前問。你一半的時間花在確認根本不需要確認的事情上。但如果你說「直接做就好，不用問」，Claude 也會在不問的情況下推送到遠端、發布套件、刪除檔案。

**規則：** 以可逆性作為判斷標準，而不是動作的類型。

**不需要詢問：** 編輯檔案、執行測試、grep、安裝套件、git add、在 feature branch 上 git commit。這些都可以撤銷。

**必須詢問：** 推送到遠端、發布套件、刪除檔案、強制操作、對外發送訊息。這些不可逆，或對他人可見。

在 feature branch 上，直到 commit 為止的所有操作都是可逆的。Push 是那條線。

---

## Context 管理

**問題：** session 開始時，Claude 很準確。一小時後，它開始犯它一開始不會犯的錯誤——忽略之前的限制、略過細節、給出模糊的答案。Context window 在填滿，性能隨之下降。

關鍵做法：
- **`/clear` 在不相關的任務之間** — 上一個任務的殘留 context 會污染下一個任務
- **`/compact focus on X`** — 帶著提示壓縮，讓相關的部分被保留
- **把進度寫到 `PLAN.md`** — 任務進度能在 `/clear` 後繼續；對話記錄不行
- **一個 session 專注一個主要任務** — 每次重新開始都是最佳狀態

詳細說明：[`docs/context-management.md`](docs/context-management.md)

---

## 快速上手

將以下 prompt 複製到你的 Claude Code 中：

```
請讀取 https://github.com/ithiria894/claude-code-best-practices 中的這些檔案：
- README.md
- .claude/skills/investigate-module/SKILL.md
- .claude/skills/trace-impact/SKILL.md
- templates/AI_INDEX_TEMPLATE.md
- CLAUDE.md

讀完後，用繁體中文向我解釋每個部分——從它解決的問題開始說起：
沒有它時會發生什麼讓人頭痛的事、為什麼會這樣，以及這個方案如何解決它。
語言要口語化、具體，讓我能說「這個問題我也有」再聽解法。

請解釋以下五項：
1. /investigate-module — Claude 在沒有讀程式碼的情況下回答問題會出什麼問題
2. /trace-impact — 改了一個地方卻不知道什麼東西會跟著壞掉的問題
3. AI_INDEX.md — 為什麼 Claude 在不熟悉的程式碼庫上會迷失方向或變慢
4. CLAUDE.md 的 <investigate_before_answering> 規則 — 為什麼告訴 Claude「小心一點」沒用
5. LSP — 為什麼用 grep 找程式碼會浪費 token 還容易出錯

解釋完五項後，詢問我要安裝哪些。
在我確認前，不要安裝任何東西。
```

---

## 範本與設定檔

| 檔案 | 說明 |
|---|---|
| [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md) | 完整的 AI_INDEX 格式，含 Connects to |
| [`templates/MEMORY_INDEX_TEMPLATE.md`](templates/MEMORY_INDEX_TEMPLATE.md) | Memory 檔案結構與 frontmatter |
| [`CLAUDE.md`](CLAUDE.md) | 含 XML 驗證規則的 CLAUDE.md 範本 |
| [`.claude/settings.json`](.claude/settings.json) | LSP + deny rules + hook 架構 |

---

## 延伸閱讀

- [`docs/context-management.md`](docs/context-management.md) — 何時 `/clear`、何時 `/compact`、如何把狀態寫到檔案
- [`docs/verification-prompting.md`](docs/verification-prompting.md) — 強制 Claude 驗證後再回答的具體措辭
- [`docs/best-practices.md`](docs/best-practices.md) — 完整說明與所有研究來源

---

## 貢獻

這是一份持續更新的文件，每項最佳實踐都來自實際驗證。

貢獻規則：
- 每個技巧都必須有來源或第一原理說明
- 不接受「加上這個就好」而沒有解釋為什麼有效
- 失敗案例和成功案例一樣有價值
