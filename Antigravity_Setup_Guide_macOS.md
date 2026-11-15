# Anti-Gravity 初始設定與連接懶人包 (macOS 版)

這是一份針對 **macOS（Apple Silicon / Intel）** 環境的 Anti-Gravity 完整初始建置懶人包，涵蓋基礎工具安裝、外部服務連線（GitHub、NotebookLM、Firebase）、MCP 設定、終端機白名單與全域自動初始化規則。

---

## 一、基礎環境安裝（macOS 方式）

### 1. 安裝 Xcode Command Line Tools
提供 `git`、`python3` 與基礎編譯工具。開啟 **終端機 (Terminal)** 執行：
```bash
xcode-select --install
```
在彈出的系統視窗點選「安裝」並同意條款，等待完成後可驗證：
```bash
xcode-select -p
git --version
python3 --version
```

### 2. 安裝 Homebrew
macOS 標準套件管理工具（安裝過程需輸入 macOS 登入密碼）：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
安裝完成後，依畫面提示將 Homebrew 加入 `PATH`（Apple Silicon 預設路徑為 `/opt/homebrew`）：
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 3. 安裝核心 CLI 工具
使用 Homebrew 一次安裝 GitHub CLI (`gh`)、`uv`（Python 工具管理）與 Node.js（含 `npm` / `npx`）：
```bash
brew install gh uv node
```
驗證安裝結果：
```bash
gh --version
uv --version
node --version
npm --version
npx --version
```

---

## 二、服務連線設定與登入授權

### 1. Git 與 GitHub 連線設定
```bash
# 設定 Git 全域使用者資訊
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# 進行 GitHub OAuth 網頁登入（會開啟瀏覽器授權）
gh auth login --web --git-protocol https

# 驗證登入狀態
gh auth status
```

### 2. NotebookLM 連線設定
透過 `uv` 安裝並管理 `notebooklm-mcp-cli`：
```bash
# 安裝 NotebookLM MCP CLI 工具
uv tool install notebooklm-mcp-cli

# 將 ~/.local/bin 加入 shell PATH（讓終端機可直接執行 nlm）
uv tool update-shell
```
開啟**新的終端機視窗**（或執行 `source ~/.zshenv`）後進行登入與診斷：
```bash
# 進行 Google 帳號授權登入（會開啟瀏覽器）
nlm login

# 檢查連線診斷與可用筆記本
nlm doctor
nlm list notebooks
```
> **安全提示**：請勿將 `gauth_credentials.json`、`notebooks.json` 或任何憑證檔提交到 Git 儲存庫。

### 3. Firebase 連線設定
```bash
# 檢查 / 下載最新版 Firebase Tools
npx -y firebase-tools@latest --version

# 登入 Firebase 帳號（開啟瀏覽器授權）
npx -y firebase-tools@latest login

# 列出專案以驗證連線
npx -y firebase-tools@latest projects:list
```

---

## 三、Antigravity MCP 設定（macOS 版）

macOS 版的 MCP 設定檔位於：`~/.gemini/antigravity/mcp_config.json`

與 Windows 版不同之處：
1. macOS 使用 **`npx`**，不是 Windows 的 `npx.cmd`。
2. 從 Finder / Spotlight（GUI）啟動 Antigravity 時，預設不會載入 Homebrew 的 `PATH`，因此建議使用完整路徑（Apple Silicon 為 `/opt/homebrew/bin/`；Intel Mac 為 `/usr/local/bin/`），並為 `npx` 補上 `env.PATH`，避免出現 `env: node: No such file or directory`。

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "/opt/homebrew/bin/uv",
      "args": ["tool", "run", "--from", "notebooklm-mcp-cli", "nlm", "mcp"],
      "disabled": false
    },
    "firebase": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "firebase-tools@latest", "mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      },
      "disabled": false
    }
  }
}
```
> 設定完成後，請重新啟動或重載 Antigravity 讓 MCP 伺服器載入最新登入憑證。

---

## 四、推薦效率與工作流設定

### 1. Terminal Commands 權限白名單（Allowlist）
在 Antigravity **Settings → Terminal Commands** 中加入常用安全指令，可減少開發時反覆跳出確認視窗：

- **Allow（建議加入）**：
  - Node.js / Firebase：`npm *`、`npx *`、`node *`
  - Git / GitHub：`git status*`、`git diff*`、`git log*`、`git add *`、`git commit *`、`gh *`
  - Python / NotebookLM：`uv *`、`python3 *`、`nlm *`
- **Deny（防呆建議）**：
  - `rm -rf *`
  - `git push --force*`

### 2. 專案目錄規劃建議
- **`~/.gemini`**：Antigravity 系統設定與資料目錄，請勿手動移動或在裡面建立專案。
- **`~/Antigravity/<project-name>`**：建議作為所有專案的統一存放區。開發特定專案時，請以**單一專案資料夾**作為 Workspace 開啟，避免不同專案的 Git 與規則互相干擾。

### 3. 全域自動初始化規則（Global Rules）
可於 `~/.gemini/config/rules/project-init.md` 建立全域規則（`trigger: always_on`），讓 Agent 自動區分「純問答」與「寫程式」：

```markdown
---
trigger: always_on
---

# 專案自動初始化與工作流規則

## 1. 觸發時機判斷
- **純問答、查資料、環境設定或初期構想討論**：**不要**執行 `git init`，也不要建立專案檔案。
- **開始寫程式或建立新專案**：在開始撰寫程式碼前，先檢查當前工作區是否已完成初始化；若尚未初始化，依下列步驟自動完成。

## 2. 專案初始化檢查項目（依序確認並補齊）
1. **Git 初始化**：若工作區尚無 `.git` 目錄，執行 `git init`。
2. **`.gitignore`**：若尚無 `.gitignore`，依專案類型建立，並務必排除敏感資料與常見暫存檔：
   - `.env`、`.env.*`
   - `gauth_credentials.json`、`notebooks.json`、`*credentials*.json`、`*.key`、`*.pem`
   - `node_modules/`、`.venv/`、`__pycache__/`、`.DS_Store`
3. **`ANTIGRAVITY.md`**：若尚無 `ANTIGRAVITY.md`，在專案根目錄建立工作流入口檔，內容包含：
   - **開工流程**：1. 讀取 `ANTIGRAVITY.md` 規則；2. 檢查 `git status` 狀態。
   - **收工流程**：1. 檢查並排除程式碼中的敏感資料（如 API key、憑證）；2. 使用 `git status` 與 `git diff` 盤點變更；3. 精確 commit 相關變更，並依使用者需求 push 至 GitHub。
```

---

## 五、macOS 常見問題排除 (FAQ)

### Q1: 執行 `npx` 或 `npm` 出現 `env: node: No such file or directory`？
- **原因**：從 GUI 啟動的應用程式未繼承 Homebrew 的 `/opt/homebrew/bin`。
- **解決方法**：在 `mcp_config.json` 中明確設定 `"env": { "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }`，並確認 `~/.zprofile` 已加入 `brew shellenv`。

### Q2: 安裝 `notebooklm-mcp-cli` 後終端機找不到 `nlm`？
- **解決方法**：執行 `uv tool update-shell` 後，**重開一個新的終端機視窗**即可生效。

### Q3: Antigravity 2.0 桌面版右側面板沒有互動式 Terminal 選項？
- **說明**：Antigravity 2.0 桌面版的右側輔助面板預設僅顯示 `Open File`、`Browser`、`Side Question`、`Extensions`、`Background Tasks`（互動式內建 Terminal 面板屬於 Antigravity IDE 的介面）。
- **替代方式**：
  1. 開啟 macOS 內建 **Terminal.app**（`⌘ + Space` 搜尋 `Terminal`）搭配使用。
  2. 直接在對話中請 Agent 執行指令，於右側 **Background Tasks** 查看輸出。
