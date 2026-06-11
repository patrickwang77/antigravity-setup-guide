# 多代理人與子代理協作系統指南：AI 開發的新範式

本指南旨在探討在 AI 輔助開發環境中，主代理人（如 Antigravity）如何透過子代理人（Sub-agents）以及本機端 CLI 工具（如 opencode CLI）進行任務派發與協同作業。這種架構代表了 AI 開發模式從單一模型對話向多角色協作（Multi-Agent Collaboration）的演進。

---

## 一、 核心目的 (Purpose)

傳統的 AI 輔助開發通常受限於單一對話框（Chat-based Interface）。當開發任務變得龐大且複雜時，單一 AI 容易因為以下原因導致效率低下：
1. **上下文爆炸**：大量的代碼讀寫、編譯錯誤日誌會塞滿對話歷史，使得模型注意力分散，並增加 Token 成本。
2. **單線程阻塞**：當 AI 在寫入或測試大量檔案時，使用者必須等待其完成，無法同時進行其他討論。

**多代理人協作架構的目的**，是建立一個**「分布式」**的開發模式：
* **主代理人 (Coordinator / Parent Agent)**：專注於高層次架構設計、任務規劃、使用者互動與最後成果的審查。
* **子代理人與執行器 (Executor / Sub-agents / CLI)**：專注於特定邊界清晰的子任務（例如：執行本機測試、跨模組重構、後台資料庫遷移），在獨立的運作空間中執行，排除雜訊。

---

## 二、 系統優點 (Advantages)

| 優點維度 | 傳統單一 AI 對話模式 | 多代理人與子代理派工模式 |
| :--- | :--- | :--- |
| **上下文管理 (Context)** | 所有細節日誌都在同一個對話框，容易混亂 | 細節留在子代理的獨立 Session，主對話框保持乾淨 |
| **工作效率 (Efficiency)** | 必須等 AI 逐行寫完檔案，中途無法做其他事 | 派發給後台子代理後，前台可繼續與使用者討論新功能 |
| **除錯與精準度** | 面對海量錯誤代碼時容易迷失方向 | 子代理可在沙盒中進行「測試-修改-再測試」的高效循環 |
| **資源消耗 (Token Cost)**| 每次對話都攜帶歷史所有程式碼，Token 消耗呈指數增長 | 僅在任務完成時回報變更摘要，大幅節省 Token |

---

## 三、 使用範例與場景 (Usage Examples)

### 場景 A：自動化除錯（TDD 循環）
1. **主代理人** 發現測試失敗，將任務派發給 **opencode CLI**：「修復 `src/auth.js` 中的 JWT 驗證錯誤，並確保 `npm test` 通過。」
2. **opencode CLI** 在背景啟動獨立的會話：
   * 讀取 `auth.js` 及其單元測試。
   * 修改代碼後執行 `npm.cmd test`。
   * 若失敗，根據報錯自動調整代碼，再次測試，直到測試全數通過。
3. **opencode CLI** 向主代理人回報：「已修復 JWT 驗證，測試已順利通過。」並附上 Git diff 摘要。
4. **主代理人** 審查 diff 後，向使用者報告成果。

### 場景 B：平行文件整理與程式碼分析
1. 使用者要求「整理整個專案的 API 文件，並生成新功能設計草案」。
2. 主代理人啟動一個名為 **Research Agent** 的子代理：
   * 子代理去專案目錄下搜尋所有的路由檔案，抓取註解。
   * 子代理將結果彙整為 Markdown。
3. 同時間，主代理人繼續在對話框與使用者討論設計草案的細節，完全不受文件整理工作的干擾。

---

## 四、 關係圖解 (Diagram)

以下是主代理人、子代理人與執行環境的指揮協作關係圖：

```mermaid
graph TD
    classDef user fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef parent fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff;
    classDef sub fill:#062f4f,stroke:#22d3ee,stroke-width:2px,color:#fff;
    classDef env fill:#1c1917,stroke:#78716c,stroke-width:1px,color:#ddd;

    User(["👤 使用者 (User)"]) :::user
    
    subgraph Client ["前台互動層"]
        Parent["🧠 主代理人 (Antigravity)<br/>*架構與決策把關*"] :::parent
    end

    subgraph Background ["背景執行層"]
        Sub1["⚙️ 子代理人 A (opencode CLI)<br/>*程式碼實作與本機測試*"] :::sub
        Sub2["🔍 子代理人 B (Research Subagent)<br/>*程式庫深度檢索與文檔整理*"] :::sub
    end

    subgraph OS ["本機與雲端環境"]
        Workspace[("📁 專案工作區")] :::env
        NotebookLM[("☁️ NotebookLM")] :::env
    end

    %% 連線
    User -->|1. 下達需求與討論| Parent
    Parent -->|2. 透過 CLI 派工| Sub1
    Parent -->|2. 啟動背景子任務| Sub2
    Sub1 <-->|3. 本機測試與寫檔| Workspace
    Sub2 <-->|3. 讀取與彙整文檔| Workspace
    Sub1 -->|4. 回報任務成果| Parent
    Sub2 -->|4. 提供彙整報告| Parent
    Parent -->|5. 最終審查與部署| NotebookLM
    Parent -->|6. 呈現最終報告| User
```
