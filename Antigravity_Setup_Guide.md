# Anti-Gravity 初始設定與連接指南 (Windows 版)

這是一份針對 Windows 環境下，設定 Anti-Gravity 與各項外部服務（GitHub、NotebookLM、Firebase）連接的完整指南，包含環境檢查、設定步驟、MCP 整合以及常見問題排除。

---

## 一、環境檢查與準備

在開始設定連線之前，請先確保系統已安裝以下工具。您可以開啟 PowerShell 執行檢查：

```powershell
# 檢查 Git 狀態
git --version

# 檢查 GitHub CLI 狀態
gh --version

# 檢查 Python 與 uv 狀態
python --version
uv --version

# 檢查 Node.js 與 npm 狀態
node --version
npm.cmd --version
```

### 踩坑經驗與排除：
1. **找不到 `node` 或 `npm` 指令**：
   - 若您剛安裝完 Node.js，當前開啟的終端機（PowerShell）尚未載入新的環境變數。您可以在 PowerShell 中執行以下指令重新載入環境變數（不需重啟電腦）：
     ```powershell
     $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
     ```
2. **PowerShell 阻擋 `.ps1` 執行原則**：
   - 在 Windows PowerShell 下，直接執行 `npm` 或 `npx` 可能會因為系統安全限制（Execution Policy）而顯示 `npm.ps1 無法載入` 的安全性錯誤。
   - **解決方案**：請一律使用 **`npm.cmd`** 與 **`npx.cmd`** 來替代 `npm` 與 `npx`。

---

## 二、服務連線設定

### 1. GitHub 連線設定
使用 GitHub CLI (`gh`) 進行安全的 OAuth 網頁瀏覽器驗證：

```powershell
# 檢查目前登入狀態
gh auth status

# 進行登入 (將會開啟瀏覽器進行授權)
gh auth login --web --git-protocol https

# 設定 Git 全域使用者資訊 (如不公開信箱，可使用 GitHub 的 no-reply 信箱)
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### 2. NotebookLM 連線設定
NotebookLM 提供 MCP (Model Context Protocol) 服務整合。我們可以使用 `uv` 工具管理：

```powershell
# 透過 uv 安裝 NotebookLM MCP 終端工具
uv tool install notebooklm-mcp-cli

# 進行 Google 帳號授權登入 (會開啟瀏覽器)
uv tool run --from notebooklm-mcp-cli nlm login

# 檢查連線診斷狀態與可用筆記本
uv tool run --from notebooklm-mcp-cli nlm doctor
uv tool run --from notebooklm-mcp-cli nlm list notebooks
```
*安全提示：請勿將 NotebookLM 產生的 `gauth_credentials.json` 或 `notebooks.json` 等金鑰、列表檔案提交到公開的 Git 儲存庫中。*

### 3. Firebase 連線設定
連線 Firebase 專案，管理 Firestore 與相關資源：

```powershell
# 檢查 Firebase Tools 版本 (若首次執行會自動下載安裝)
npx.cmd -y firebase-tools@latest --version

# 登入 Firebase 帳號 (開啟瀏覽器授權)
npx.cmd -y firebase-tools@latest login

# 列出所有 Firebase 專案以驗證連線
npx.cmd -y firebase-tools@latest projects:list
```

---

## 三、MCP (Model Context Protocol) 設定參考

如果您需要在 Anti-Gravity 中將這些服務註冊為 MCP 伺服器，可在用戶端 MCP 設定檔中加入以下區段：

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "uv",
      "args": ["tool", "run", "--from", "notebooklm-mcp-cli", "nlm", "mcp"],
      "disabled": false
    },
    "firebase": {
      "command": "npx.cmd",
      "args": ["-y", "firebase-tools@latest", "mcp"],
      "disabled": false
    }
  }
}
```

---

## 四、常見異常排除 (FAQ)

### Q1: 為什麼無法拖曳檔案（Drag & Drop）到對話框中？
* **原因 A**：對話框對拖曳區域有嚴格限制，必須精準拖入**寫著「Ask anything...」的輸入框內**。
* **原因 B（權限不對等）**：如果您的 Anti-Gravity 桌面程式是以「系統管理員身分執行」啟動的，而 Windows 檔案總管是普通權限，Windows 的 UIPI 機制會阻擋拖曳。
  - **排除方法**：關閉程式，並以普通用戶身分（雙擊圖示，不按右鍵管理員執行）重新開啟。
* **替代做法**：直接在檔案總管複製檔案 (`Ctrl+C`)，並在輸入框貼上 (`Ctrl+V`)；或點選輸入框左下角的 `+` 按鈕手動選取。

### Q2: 執行 `nlm` 或 `npm` 遇到 `CommandNotFoundException` 錯誤？
* **排除方法**：請確認已安裝 Node.js，並在 PowerShell 中執行環境變數更新指令以重載 `PATH`，或者重啟您的終端機/開發工具。

---

## 五、開工與收工工作流 (ANTIGRAVITY.md)

專案根目錄下建議建立 `ANTIGRAVITY.md` 規則檔作為 AI 工作入口：

* **開工流程**：
  1. 讀取 `ANTIGRAVITY.md` 規則。
  2. 檢查 `git status` 狀態。
* **收工流程**：
  1. 檢查並排除程式碼中的敏感資料（如 API key 等）。
  2. 使用 `git status` 與 `git diff` 盤點變更。
  3. 精確 commit 相關變更，並 push 至 GitHub。
