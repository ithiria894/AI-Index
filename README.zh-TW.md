# AI Index

> 給 coding agents 用的導航基建。

[English](README.md)

大部分 AI coding 失敗，不是因為模型不夠聰明。

而是因為它迷路了。

模型可以讀 code，但它仍然要自己摸索：

- 應該從哪裡開始
- 哪些檔案屬於同一個 change surface
- 哪些 convention 不會直接出現在 import edge 上
- 改完這裡後，還有什麼一定要一起檢查

這個 repo 想解決的，就是這個問題。

## 核心主張

傳統 documentation 是寫給人看的。

AI coding agent 不需要每個 feature 都有人話重寫一次，因為它可以直接看 code。它真正缺的是一張可靠的地圖：

- 應該先開哪個 domain file
- 哪些 layer 本來就是一起變動的
- 哪些 config、job、test、schema、migration 最容易漏
- 哪些 repo-specific 規則會改變 blast radius

`AI Index` 就是這張地圖。

它不是 generated symbol dump。
它不是 call graph。
它不是人類 knowledge base。

它是一個由 AI 維護、專門給 AI 做 change-complete navigation 用的 repository graph。

## 這個 Repo 放了什麼

這個 repo 把整套方法包成 Claude Code 友善的形式：

- AI Index spec
- 最小 template
- `use`、`generate`、`sync` 三類 skills

主要檔案：

- [`docs/AI_INDEX_SPEC.md`](docs/AI_INDEX_SPEC.md)
- [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md)
- [`skills/ai-index/SKILL.md`](skills/ai-index/SKILL.md)
- [`skills/use-ai-index/SKILL.md`](skills/use-ai-index/SKILL.md)
- [`skills/generate-graph/SKILL.md`](skills/generate-graph/SKILL.md)
- [`skills/sync-graph/SKILL.md`](skills/sync-graph/SKILL.md)

## 核心概念

AI Index 夾在 raw code search 和傳統 documentation 之間。

Raw code search 很擅長回答局部真相：

- 這個檔案做什麼
- 這個 function call 了什麼
- 這個 symbol 在哪裡定義

但 raw search 不擅長回答 repo-level completeness：

- 哪些 sibling layers 也要一起看
- 這個 task 應該歸哪個 domain
- 哪些 convention 是真的存在，但 import edge 看不出來

傳統 docs 或 knowledge graph 很擅長敘事：

- 這個 subsystem 是做什麼的
- 人類會怎樣描述它
- 高層 flow 長什麼樣

但它們通常不擅長 edit completeness：

- live code surface cover 不夠
- 很容易 stale
- 維護成本高
- 最後 agent 還是要重新找一輪真正的 touch points

AI Index 就是中間那個 sweet point：

- 比 prose docs 更結構化
- 比 flat index 更懂 repo
- 比人類導向 documentation 更少重複

## Data Structure：Tree 同 Graph 的分別

這是最重要的設計差異。

### 傳統 Knowledge Graph / Documentation Tree

典型形狀：

```text
index
  -> feature doc
    -> deeper doc
      -> code pointers
```

它本質上仍然是一棵 document tree。

它擅長回答：

- 「這個 feature 是什麼？」
- 「這個系統怎樣運作？」
- 「人下一步應該看哪份文檔？」

所以它很適合 onboarding 和 architecture walkthrough。

### AI Index Graph

典型形狀：

```text
AI_INDEX.md
  -> domain file
    -> change surfaces
    -> must_check rules
    -> critical nodes
    -> verified edges
```

它是一張 traversal graph。

它擅長回答：

- 「我應該先開哪個 domain？」
- 「如果我改這個 route 或 service，還要一起看什麼？」
- 「哪些檔案本來就屬於同一個 change surface？」

所以它很適合 implementation、debug、impact analysis，以及避免漏改 related changes。

## Methodology

整套 workflow 有四部分。

### 1. Use

當 repo 已經有 AI Index：

- 先讀 `AI_INDEX.md`
- 選最相關的一小組 domains
- 只開那些 domain files
- 看清楚 change surfaces
- 編輯前先跟 `must_check`

這樣可以避免 agent 一開工就盲搜。

### 2. Generate

當 repo 還沒有 AI Index：

- inspect repo structure
- 找出真正的 domains
- 為每個 domain 畫出主要 change surfaces
- 只記錄高價值 nodes 和 verified edges
- 不寫給人看的 prose

重點不是把每個 function 都編目。

重點是做一張之後能讓改動更完整的 graph。

### 3. Sync

做完有意義的改動之後：

- 看 changed files
- 對回受影響的 domains
- 更新對應 domain file
- 只有影響 repo-wide 行為時才改 root rules
- 重新檢查 path 和 links

這樣就可以低成本維護 graph，而不是每次重建整套。

### 4. Validate

在相信這份 index 之前：

- 確認 path 還存在
- 確認 `[[wikilink]]` 還 resolve 得到
- 確認 domains 仍然符合真實 repo 結構
- 確認 graph 仍然反映現在的 change surfaces

## 為什麼要由 AI 來建

這個 repo 以前比較依賴 generator script。

後來發現，重心放錯了。

script 很擅長做 syntax extraction。

但它不擅長決定：

- 真正的 domain boundary 是什麼
- 哪些 edges 對 change completeness 最重要
- 哪些 convention import 看不出來
- 哪些 nodes 值得保留
- 哪些 `must_check` 規則是一個 edit 會不會做完整的關鍵

對第一版 graph 來說，AI 的判斷通常比 deterministic coverage 更值錢。

## Benchmark 摘要

推動這個方向的公開 benchmark 文章在這裡：

https://dev.to/ithiria894/the-bottleneck-for-ai-coding-assistants-isnt-intelligence-its-navigation-2p30

八個 benchmark task 的整體結果很一致：

- graph 通常可以減少 tool calls
- graph 通常可以減少跨 surface task 的 token 消耗
- 當 task 牽涉多層時，graph 對 change completeness 的幫助最明顯

### Benchmark Table

| Test | Graph | 比較組 | 觀察 |
|---|---:|---:|---|
| 1 | `14K` tokens / `10` tool calls | `14K` / `12` | token 一樣，但步驟更少，cascade awareness 更好 |
| 2 | `5K` / `4` | `5.1K` / `5` | 稍微更省，步驟更少 |
| 3 | `11K` / `10` | `14K` / `14` | 成本更低，traversal 更乾淨 |
| 4 | `5K` / `5` | `6K` / `8` | 成本更低，tool calls 更少 |
| 5 | `16K` / `12` | `22K` / `18` | 成本更低，而且 edit completeness 更高 |
| 6 | `48K` / `14` | `72K` / `26` | 大 repo 導航優勢明顯 |
| 7 | `55K` / `18` | `82K` / `33` | 大 repo 導航優勢明顯 |
| 8 | `61K` / `17` | docs: `64K` / `35`, no-map: `47K` / `30` | graph 比超窄 no-map run 用多了 token，但仍然大幅減少 tool churn，也優於 prose-doc flow |

### 這些數字代表什麼

- 對 no-map baseline，median token savings 大約是 `21%`
- 對 no-map baseline，average tool-call reduction 大約是 `34%`
- 最大收益通常出現在 task 同時跨 route、service、schema、test、config、job 或 migration 的時候

最重要的 nuance 是：

AI Index 並不保證在每個超小 task 上都是最省 token 的路。

如果 task 本身很窄、很 local，而且 touch point 已經很明顯，直接看 code 可能更便宜。

但一旦 task 變成「我要改這裡，而且不可以漏任何 related change」，graph 就會開始回本。

## 為什麼我們說它可以 cover 約 95% 傳統 Knowledge Graph 的實際用途

這是一個很實務的說法，不是哲學命題。

日常 coding workflow 裡，大家真正問的通常是：

- 我要從哪裡開始
- 還有什麼是 related 的
- 哪些檔案本來就會一起動
- 如果我只跟 imports 走，我會漏掉什麼
- 哪些 tests 或 config surfaces 一定要檢查

這些正正就是 AI Index 在回答的問題。

所以對日常 coding、debug、review、impact analysis 這些工作來說，它通常可以取代大約 `95%` 傳統 knowledge graph 的實際價值。

剩下那大約 `5%`，通常是：

- onboarding 敘事
- 歷史設計理由
- 給人類看的 architecture storytelling
- 要拿去和非寫 code 的人溝通的材料

這些當然還是可能有價值。

只是對一個正在改 code 的 agent 來說，它們通常不是最高槓桿的格式。

## 什麼情況下 AI Index 最好用

適合用 AI Index 的情況：

- repo 中大型
- task 常常跨多層
- agent 容易改漏 related edits
- repo conventions 的重要性和 import edges 一樣高
- 你重視 blast-radius analysis 和 change completeness

特別適合：

- 有 hidden side effect 的 bug fix
- 會同時改到 route、service、schema、config、test 的 feature work
- entry point 很多的大 repo
- review workflow 裡想知道「其實還應該改哪裡」的場景

## 什麼情況下傳統 Documentation 仍然有價值

傳統 docs 仍然有幫助，如果：

- 新工程師需要先聽故事才敢碰 code
- 系統有很多 code 看不出來的 business context
- 你要的是給人看的架構溝通材料，不是給 AI 的導航圖
- repo 很小，本身直接 sweep 一次就夠

這個 repo 不是在說 human documentation 完全沒用。

它是在說：對 AI-assisted coding 來說，人類導向 documentation 經常不是最應該先維護的主 artifact。

## 好處

- 非 trivial repo 更快定向
- 減少浪費的 tool calls
- blast-radius analysis 更穩
- edit completeness 更高
- 比 prose-heavy doc system 少重複
- 比 full knowledge graph 更容易維護

## 不足

- 仍然需要有紀律地更新
- 如果 sync 沒做，會 drift
- 不能取代讀 source code
- 對 onboarding narrative 不如人類文件
- 小 repo 可能有點 overkill
- domain boundary 分錯，graph 就會變吵

## 為什麼 Folder 通常比傳統 Documentation 更細

AI Index 只保留 code search 找不到、但 change completeness 很重要的資訊：

- domain boundaries
- change surfaces
- non-obvious coupling
- must-check rules
- 少量 anchor nodes

它刻意不保留：

- 長篇 feature summary
- 重複解釋 code behavior 的 prose
- exhaustive function-by-function 說明
- 可以靠 search 反推的 inverse relationships

所以通常會出現：

- 字更少
- 重複更少
- doc footprint 更小
- operational signal 對 maintenance cost 的比例更高

## 預設 Layout

```text
AI_INDEX.md
AI_INDEX/
  domain-a.md
  domain-b.md
  domain-c.md
```

Root file 放：

- read order
- repo-wide rules
- domain index

Domain file 放：

- scope
- change surfaces
- must-check rules
- critical nodes

## Quick Start

先把它裝成 Claude Code plugin：

```bash
/plugin add-marketplace https://github.com/ithiria894/AI-Index
/plugin install codebase-navigator
```

然後預設從這裡開始：

```text
/ai-index
```

常見模式：

- `/use-ai-index`：repo 已經有 index
- `/generate-graph`：從零開始建立
- `/sync-graph`：做完有意義改動後同步

## Bottom Line

如果你的問題是「AI 不明白這個 feature 是什麼」，那你應該寫 docs。

如果你的問題是「AI 改了一個檔案，但漏了另外五個相關檔案」，那你應該建 AI Index。

這就是這個 repo 的整個賭注。
