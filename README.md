# PDF Extractor - Packing List & Commercial Invoice 對照工具

這是一個基於 HTML 與 JavaScript 的前端工具，用於將 Packing List 與 Commercial Invoice (EI) PDF 檔案進行單價對照，並提供資料預覽、單筆刪除，以及匯出為 Excel (`.xlsx`) 或 CSV 格式的功能。

## 功能特點

1. **拖曳上傳與自動分類**：拖入 Packing List 或 Invoice 檔案後，程式會根據檔名自動分類。
2. **PDF 文字自動解析**：使用 `pdf.js` 技術在前端直接讀取與解析 PDF 中的文字。
3. **智慧單價對照**：分析 Packing List 中的料號與數量，對應 EI 檔案中的單價，並將欄位格式化。
4. **預覽與管理**：提供即時資料預覽表格與單筆刪除功能。
5. **多格式匯出**：支持匯出為 Excel (`.xlsx`) 與帶有 UTF-8 BOM 的 CSV 檔案。

## 使用技術

- HTML5 / Vanilla CSS
- Vanilla JavaScript
- [PDF.js](https://mozilla.github.io/pdf.js/) (解析 PDF 文字)
- [SheetJS](https://sheetjs.com/) (匯出 Excel/CSV)
- [Lucide Icons](https://lucide.dev/) (圖示)

## 本地開發與運行

直接在瀏覽器中開啟 `index.html`，或者使用本機 HTTP 伺服器運行本專案。
