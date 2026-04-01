# Claude Code 最佳實踐

[English](README.md)

你問 Claude 一個函式是怎樣運作的。它給你一個詳盡、自信的解釋。

你根據它說的繼續做了一個小時。然後你發現它說的是錯的。

又或者：你改了一個函式，測試通過，你 ship 了。三天後——四個地方都在呼叫那個函式，全部壞掉了。Claude 從來沒有提醒你。

根本原因只有一個：**Claude 沒有辦法在你的程式碼庫裡導航。**

它每次從零開始。它讀你給它的東西。它猜它沒有的東西。你就得到幻覺、漏掉的影響範圍、盲點裡引入的 bug。

解決方案不是更聰明的模型。是一張地圖。

---

## 這個 plugin 做什麼

四個 Claude Code 技能，給 Claude 一張持久、結構化的程式碼庫地圖——加上有效使用它的工作流程。

| 技能 | 功能 |
|---|---|
| `/generate-graph` | 建立程式碼庫地圖（domain → 檔案 → 關係 → 文件連結） |
| `/sync-graph` | 改動後保持地圖更新 |
| `/debug` | 定位 → 找根因 → Codex 掃描 → 修復 |
| `/new-feature` | 找現有模式 → 追蹤影響 → 實作 |

地圖（AI_INDEX.md）存在你的 repo 裡。Claude 在每次任務開始時讀取它。它知道哪些檔案屬於哪個 domain、現有的模式是什麼、文件在哪裡。

---

## 你的工作流程（人的部分）

你不需要理解內部機制。你不需要選擇方法。Plugin 會自動處理。以下是你的工作日實際上的樣子：

**第一次用這個 repo：**
```plaintext
/generate-graph
```
完成。30 秒。你現在有一張 graph 了。

**有人回報了一個 bug：**
```plaintext
你：「修這個 bug：[貼上 Slack 訊息 / 錯誤 / 截圖]」
```
Claude 自動讀取 graph、找到對應的 domain、讀取文件、追蹤程式碼、找出根因、提出修復方案。你 review 然後 merge。

**有人要求一個新功能：**
```plaintext
你：「加這個功能：[貼上需求]」
```
Claude 找一個類似的現有功能，跨所有層複製模式，然後實作。你 review 然後 merge。

**你懷疑同樣的 bug 可能有更多地方：**
```plaintext
你：「用 Codex 在這個檔案裡掃描同樣的模式」
```
Codex 用 ~$0.02 做徹底的暴力掃描，找出每一個 instance。Claude 全部修掉。

**就是這樣。** 你貼上問題，Claude 跑完工作流程，你 review 輸出。Graph、文件、BFS 遍歷、模式掃描——全部在背後自動進行。你不需要手動呼叫技能，不需要選擇方法。你只需要說你要什麼。

你唯一需要記住的：
- 第一次 → `/generate-graph`
- 之後 → 直接貼上任務讓 Claude 去做

---

## 它是怎麼運作的

### 地圖

`/generate-graph` 產生 `AI_INDEX.md`——一個結構化的路由清單：

```yaml
## Domain: auth
Files: src/auth/login.py, src/auth/tokens.py, src/auth/middleware.py
Patterns: JWT tokens, session handling
Docs: docs/auth/overview.md
```

Claude 在每次任務開始時讀取它。它知道哪些檔案屬於哪個 domain、現有的模式是什麼、文件在哪裡。沒有幻覺，沒有猜測。

### 各技能說明

**`/debug`** — 結構化工作流程，不是一個 prompt

1. 定位入口點（graph → domain → 檔案）
2. 讀取相關程式碼
3. 找出根因
4. Codex 掃描：對所有檔案做徹底掃描找同樣模式（~$0.02）
5. 修復所有 instance

**`/new-feature`** — 找現有模式，複製它

1. Graph → 找一個類似的現有功能
2. 追蹤那個功能的影響，了解它碰到了哪些層
3. 按照同樣模式在每一層實作新功能

**`/sync-graph`** — 保持地圖更新

重大改動後，`/sync-graph` 更新 AI_INDEX.md。把新檔案加到正確的 domain、更新模式列表、保持文件連結有效。

---

## 它真的有效嗎？

九個 benchmark 任務，跨越不同大小的 repo（小型 hobby 專案到 77K 檔案的 monorepo），比較對象：有 graph 的導航 vs. 沒有地圖 vs. 專案文件 vs. fullstack-debug vs. Aider 的 PageRank 地圖。

### 總結：各方法在什麼情況下有效？

| 任務類型 | Token 節省（graph vs 無地圖） | 品質差異 |
|---|:---:|---|
| Bug fix（入口明確） | ~0% | Graph 找到其他方法漏掉的**連鎖影響** |
| Bug fix（UI 流程） | ~3% | 相當 |
| 新功能規劃 | **23%** | Graph 知道哪些檔案可以跳過 |
| 理解一個流程 | **17%** | Graph 直接提供入口點 |
| 模式稽核（大型 repo） | **42%** | Graph + Codex = 100% 覆蓋率 |
| 跨 repo 調查 | **33%** | Graph 指向正確的 repo/domain |
| 功能調查（大型 repo） | 不定 | **Aider PageRank 失敗；graph + docs 勝出** |

### Test 1 — Bug fix：缺少 rate limit（小型 repo）

| 指標 | A（graph） | B（無地圖） |
|------|:---:|:---:|
| Tokens | 14K | 14K |
| Tool calls | 10 | 12 |
| 找到根因？ | ✅ | ✅ |
| 找到連鎖影響？ | ✅ | ❌ |

**Token 一樣，但 B 漏掉了 restore/undo 路徑。** 它修了主要的 bug，卻留下一個次要的程式碼路徑壞掉。A 找到了，因為 trace-impact 走完了完整的 call graph。

### Test 2 — Bug fix：UI 刷新問題（小型 repo）

| 指標 | A（graph） | B（無地圖） |
|------|:---:|:---:|
| Tokens | 5K | 5.1K |
| Tool calls | 4 | 5 |
| 找到根因？ | ✅ | ✅ |

簡單的 UI bug——效能相當。入口點明顯時 graph 幫助不大。

### Test 3 — 新功能規劃（小型 repo）

| 指標 | A（graph） | B（無地圖） |
|------|:---:|:---:|
| Tokens | 11K | **14K** |
| Tool calls | 10 | 14 |
| 正確識別影響範圍？ | ✅ | ✅ |

**少 23% token。** Graph 告訴 Claude 哪些檔案可以跳過。B 探索了結果發現不相關的檔案。

### Test 4 — 理解一個流程（小型 repo）

| 指標 | A（graph） | B（無地圖） |
|------|:---:|:---:|
| Tokens | 5K | **6K** |
| Tool calls | 5 | 8 |
| 解釋準確？ | ✅ | ✅ |

**少 17% token，少 37% tool calls。** Graph 直接提供入口點。

### Test 5 — 模式稽核：找出所有同樣 bug 模式的 instance（小型 repo）

| 指標 | A（graph） | B（無地圖） | A + Codex 掃描 |
|------|:---:|:---:|:---:|
| Tokens | 16K | 22K | 16K + $0.02 |
| Tool calls | 12 | 18 | 12 + 掃描 |
| 覆蓋率 | ~80% | ~60% | **100%** |

**兩個 agent 單獨都達不到 100%。** Graph + Codex 掃描：graph 縮小搜尋範圍，Codex 做徹底的暴力掃描。用 ~$0.02 達到完整覆蓋。

### Test 6 — Bug fix：缺少 feature flag（大型 repo，77K 檔案）

| 指標 | A（graph） | C（無地圖） |
|------|:---:|:---:|
| Tokens | 48K | **72K** |
| Tool calls | 14 | 26 |
| 找到根因？ | ✅ | ✅ |

**在 77K 檔案的 repo 上少 33% token。** Graph 把搜尋範圍從整個 monorepo 縮小到單一 domain。C 廣泛探索後才找到正確的區域。

### Test 7 — 跨 repo 調查：前端呼叫後端（大型 repo）

| 指標 | A（graph） | C（無地圖） |
|------|:---:|:---:|
| Tokens | 55K | 82K |
| Tool calls | 18 | 33 |
| 找到後端 endpoint？ | ✅ | ✅ |
| 找到接線缺口？ | ✅ | ❌ |

C 找到了後端 endpoint。A 也找到了——加上發現前端元件呼叫了 `get_tool_input_text()`。基礎設施已就緒，呼叫者還沒接上。**Graph 比無地圖省了 33% token。**

### Test 8 — 新功能調查：session context tool calls（大型 repo，4 種方法）

前端開發者問：我們可以把 tool calls、in/out flags、tool names 加到 session context API 嗎？

| 指標 | A（graph） | C（無地圖） | D（專案文件） | E（fullstack-debug） | Aider map |
|------|:---:|:---:|:---:|:---:|:---:|
| Tokens | 61K | 47K | 64K | 49K | N/A |
| Tool calls | **17** | 30 | 35 | 32 | N/A |
| 找到 endpoint？ | ✅ | ✅ | ✅ | ✅ | **❌** |
| 找到現有 helpers？ | ✅ | ✅ | ✅ | ✅ | — |
| 額外洞察 | — | — | ⚠️ ingestion 注意事項 | — | — |

**Aider 的 PageRank 地圖完全失敗**——560 行的地圖，但 session context endpoint 不夠「重要」沒有被納入。Agent D（專案文件）找到了一個其他方法都漏掉的資料儲存注意事項。Agent A 用了最少的 tool calls（17 vs 30-35）。

### 關鍵發現

**Graph 最大的價值不是省 token——是防止漏掉影響範圍。** 在 10 個檔案的 repo 上，token 節省是 17-23%。在 77K 檔案的 repo 上，跳到 33-42%。但找到 Test 1 的連鎖 bug（只有 graph 版本抓到的 restore/undo 路徑）——那是質的差異，不是量的差異。

**Aider 的 PageRank 方法在特定功能調查上失敗。** 它優化「全域重要的」函式，而不是「和你的任務相關的」函式。在 77K 檔案的 repo 上，session context endpoint 根本沒有出現在 Aider 的 560 行地圖裡。

**任何單一方法都無法在模式稽核上達到 100% 覆蓋率。** 最佳工作流程是混合式：graph 縮小搜尋範圍，然後 Codex 做 ~$0.02 的徹底暴力掃描。

**專案文件有獨特的價值**——程式碼本身無法告訴你的 domain-specific 注意事項和業務邏輯。Graph 的 `Docs:` 欄位自動連結到這些 per-domain 文件。

---

## 快速上手

以 Claude Code plugin 安裝——一個指令就能加到任何專案：

```bash
# 加入 marketplace
/plugin add-marketplace https://github.com/ithiria894/claude-code-best-practices

# 安裝
/plugin install codebase-navigator
```

安裝後，技能在任何專案都可以使用：

```
/codebase-navigator:generate-graph    → 建立 graph
/codebase-navigator:debug             → 修 bug
/codebase-navigator:new-feature       → 新增功能
/codebase-navigator:sync-graph        → 保持 graph 更新
```

在新 repo 上跑 `/codebase-navigator:generate-graph` 開始使用。之後只需要描述你的任務——Claude 會自動選擇正確的技能。

**手動安裝**（如果你偏好複製檔案）：參考 [手動安裝指南](docs/manual-setup.md)。

---

## 範本與設定檔

| 檔案 | 說明 |
|---|---|
| [`scripts/generate-ai-index.mjs`](scripts/generate-ai-index.mjs) | Deterministic AI_INDEX 生成器——掃描 imports，輸出路由清單 |
| [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md) | 完整的 AI_INDEX 格式，含 Connects to 和 Docs 欄位 |
| [`templates/MEMORY_INDEX_TEMPLATE.md`](templates/MEMORY_INDEX_TEMPLATE.md) | Memory 檔案結構與 frontmatter |
| [`.claude/settings.json`](.claude/settings.json) | LSP + deny rules + hook 架構 |

---

## 貢獻

這是一份持續更新的文件，每項最佳實踐都來自實際驗證。

貢獻規則：
- 每個技巧都必須有來源或第一原理說明
- 不接受「加上這個就好」而沒有解釋為什麼有效
- 失敗案例和成功案例一樣有價值
