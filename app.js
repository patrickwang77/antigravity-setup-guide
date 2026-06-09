// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const unifiedDropZone = document.getElementById('unified-drop-zone');
const unifiedFileInput = document.getElementById('unified-file-input');
const dropPrompt = document.getElementById('drop-prompt');
const classifiedFileList = document.getElementById('classified-file-list');

const plItemCard = document.getElementById('pl-item');
const plNameLabel = document.getElementById('pl-name-label');

const eiItemCard = document.getElementById('ei-item');
const eiNameLabel = document.getElementById('ei-name-label');

const btnRun = document.getElementById('btn-run');
const btnClearFiles = document.getElementById('btn-clear-files');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const progressContainer = document.getElementById('progress-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressDetail = document.getElementById('progress-detail');
const progressPercent = document.getElementById('progress-percent');
const infoBox = document.getElementById('info-box');
const infoText = document.getElementById('info-text');

const btnExportXlsx = document.getElementById('btn-export-xlsx');
const btnExportCsv = document.getElementById('btn-export-csv');

const tablePlaceholder = document.getElementById('table-placeholder');
const dataTable = document.getElementById('data-table');
const tableBody = document.getElementById('table-body');
const previewCount = document.getElementById('preview-count');
const btnClearPreview = document.getElementById('btn-clear-preview');

// Application State
let plFile = null;
let eiFile = null;
let mappedResultRows = []; // cumulative list of mapped rows: each is a 10-element array

// Setup Unified Drag and Drop
unifiedDropZone.addEventListener('click', () => unifiedFileInput.click());

unifiedFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

unifiedDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    unifiedDropZone.classList.add('dragover');
});

unifiedDropZone.addEventListener('dragleave', () => {
    unifiedDropZone.classList.remove('dragover');
});

unifiedDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    unifiedDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// Classify and handle selected files
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name.toUpperCase();
        
        // Simple name-based classification
        if (name.includes('PL') || name.includes('PACKING')) {
            plFile = file;
        } else if (name.includes('EI') || name.includes('INVOICE') || name.includes('COMMERCIAL')) {
            eiFile = file;
        }
    }
    
    updateFileSelectorUI();
}

// Update file uploading card state
function updateFileSelectorUI() {
    if (plFile || eiFile) {
        dropPrompt.style.display = 'none';
        classifiedFileList.style.display = 'flex';
        btnClearFiles.disabled = false;
    } else {
        dropPrompt.style.display = 'flex';
        classifiedFileList.style.display = 'none';
        btnClearFiles.disabled = true;
    }
    
    // PL file state
    if (plFile) {
        plItemCard.classList.remove('missing');
        plNameLabel.textContent = `${plFile.name} (${formatBytes(plFile.size)})`;
    } else {
        plItemCard.classList.add('missing');
        plNameLabel.textContent = '尚未載入';
    }
    
    // EI file state
    if (eiFile) {
        eiItemCard.classList.remove('missing');
        eiNameLabel.textContent = `${eiFile.name} (${formatBytes(eiFile.size)})`;
    } else {
        eiItemCard.classList.add('missing');
        eiNameLabel.textContent = '尚未載入';
    }
    
    // Check if both are ready
    if (plFile && eiFile) {
        btnRun.disabled = false;
        statusDot.className = 'status-dot idel';
        statusText.textContent = '來源檔案就緒，點擊 Run 開始解析對照...';
    } else {
        btnRun.disabled = true;
        statusDot.className = 'status-dot idel';
        if (plFile) {
            statusText.textContent = '已載入 Packing List，請拖入對應的 EI PDF...';
        } else if (eiFile) {
            statusText.textContent = '已載入 EI PDF，請拖入對應的 Packing List...';
        } else {
            statusText.textContent = '請先載入 PDF 檔案...';
        }
    }
}

// Clear currently selected files
btnClearFiles.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering input click
    clearUploadedFiles();
});

function clearUploadedFiles() {
    plFile = null;
    eiFile = null;
    unifiedFileInput.value = '';
    updateFileSelectorUI();
}

// Progress bar updater
function updateProgress(percent, text) {
    progressContainer.style.display = 'flex';
    progressBarFill.style.width = `${percent}%`;
    progressDetail.textContent = text;
    progressPercent.textContent = `${percent}%`;
}

// Format file size
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Convert PDF file to flat string of text
async function extractPdfTextFlat(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = "";

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Join all items with a space. PDF.js returns them in logical reading order.
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `\n--- Page ${pageNum} ---\n` + pageText;
    }

    return fullText;
}

// Clear all mapped data in the preview panel
btnClearPreview.addEventListener('click', () => {
    mappedResultRows = [];
    renderPreviewTable();
    updateExportButtons();
    
    infoBox.style.background = 'rgba(139, 92, 246, 0.05)';
    infoBox.style.borderColor = 'rgba(139, 92, 246, 0.15)';
    infoText.innerHTML = `已清空所有轉換資料。請上傳配對檔案點擊 Run 重新產生。`;
});

// Run mapping on the currently uploaded files
btnRun.addEventListener('click', async () => {
    if (!plFile || !eiFile) return;

    try {
        btnRun.disabled = true;
        btnClearFiles.disabled = true;
        
        const currentPlName = plFile.name;
        const currentEiName = eiFile.name;
        
        let plParsedData = [];
        let eiPriceMap = {};
        let newResultRows = [];

        // Step 1: Parse Packing List
        updateProgress(15, '正在讀取 Packing List PDF...');
        const plText = await extractPdfTextFlat(plFile);

        updateProgress(35, '正在解析 Packing List 欄位資料...');
        const plRegex = /(\d+)\s+([\w\-]+)\s+([\d,]+)\s+EA\s+(\d+)\s+(\d+)/gi;
        
        let match;
        while ((match = plRegex.exec(plText)) !== null) {
            const itemNo = match[1];
            const materialNo = match[2];
            const qtyStr = match[3];
            const stoNo = match[4];
            const stoLine = match[5];
            const qty = parseInt(qtyStr.replace(/,/g, ''), 10);
            
            plParsedData.push({
                itemNo,
                materialNo,
                qty,
                stoNo,
                stoLine
            });
        }

        if (plParsedData.length === 0) {
            throw new Error(`無法從 Packing List (${currentPlName}) 中提取有效的項目資料。`);
        }

        const plMaterialNumbers = [...new Set(plParsedData.map(item => item.materialNo))];

        // Step 2: Parse EI File
        updateProgress(55, '正在讀取 EI PDF...');
        const eiText = await extractPdfTextFlat(eiFile);

        updateProgress(75, '正在對照 EI 單價資料...');
        
        // Find positions of unique material numbers in EI text
        const matPositions = [];
        plMaterialNumbers.forEach(mat => {
            let pos = 0;
            while (true) {
                pos = eiText.indexOf(mat, pos);
                if (pos === -1) break;
                matPositions.push({ pos, mat });
                pos += mat.length;
            }
        });

        matPositions.sort((a, b) => a.pos - b.pos);

        // Segment into blocks
        const blocks = [];
        for (let i = 0; i < matPositions.length; i++) {
            const current = matPositions[i];
            const nextPos = (i + 1 < matPositions.length) ? matPositions[i+1].pos : eiText.length;
            const blockText = eiText.slice(current.pos, nextPos);
            blocks.push({ mat: current.mat, text: blockText });
        }

        // Process blocks
        blocks.forEach(block => {
            const normalizedText = block.text.replace(/[\r\n]+/g, ' ');
            const tokens = normalizedText.split(/\s+/).filter(t => t.trim().length > 0);
            const matchingPlItems = plParsedData.filter(item => item.materialNo === block.mat);
            
            matchingPlItems.forEach(item => {
                const targetQty = item.qty;
                
                // Find correct qty token index (followed by decimal)
                let qtyTokenIdx = -1;
                for (let i = 0; i < tokens.length; i++) {
                    const val = parseInt(tokens[i].replace(/,/g, ''), 10);
                    if (val === targetQty) {
                        if (i + 1 < tokens.length && tokens[i+1].includes('.')) {
                            qtyTokenIdx = i;
                            break;
                        }
                    }
                }
                
                if (qtyTokenIdx === -1) return;
                
                // Gather decimals
                const decimals = [];
                for (let i = qtyTokenIdx + 1; i < Math.min(qtyTokenIdx + 20, tokens.length); i++) {
                    const token = tokens[i];
                    if (token.includes('.')) {
                        const clean = token.replace(/[^0-9\.]/g, '');
                        const val = parseFloat(clean);
                        if (!isNaN(val)) {
                            decimals.push(val);
                        }
                    }
                }
                
                // 3rd decimal is Unit Price
                let unitPrice = null;
                if (decimals.length >= 3) {
                    unitPrice = decimals[2];
                } else if (decimals.length > 0) {
                    unitPrice = decimals[decimals.length - 1];
                }
                
                if (unitPrice !== null) {
                    const key = `${block.mat}_${targetQty}`;
                    eiPriceMap[key] = unitPrice;
                }
            });
        });

        // Step 3: Map Data
        updateProgress(90, '正在產生轉換資料...');
        const today = new Date();
        const formattedDate = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
        
        plParsedData.forEach(item => {
            const priceKey = `${item.materialNo}_${item.qty}`;
            const unitPrice = eiPriceMap[priceKey] !== undefined ? eiPriceMap[priceKey] : '';
            
            let qssMaterialNo = item.materialNo;
            if (!qssMaterialNo.toUpperCase().startsWith('7SD')) {
                qssMaterialNo = '7SD' + qssMaterialNo;
            }

            newResultRows.push([
                formattedDate,             // 日期
                item.stoNo,                // STO #
                item.stoLine,              // Line
                qssMaterialNo,             // QSS 料號
                item.qty,                  // 數量
                'SHNSSD03',                // 廠商
                'S01',                     // 預計入庫倉
                'B2B',                     // 出貨指示類型
                '\u3000',                  // AI# (全形空白)
                unitPrice                  // 單價
            ]);
        });

        // Append to global state
        mappedResultRows = mappedResultRows.concat(newResultRows);

        // Step 4: Render UI Table
        updateProgress(95, '正在更新預覽表格...');
        renderPreviewTable();
        updateExportButtons();

        // Complete UI reset for next files
        updateProgress(100, '完成對照解析！');
        statusDot.className = 'status-dot completed';
        statusText.textContent = `解析完成！本次從 [${currentPlName}] 新增 ${newResultRows.length} 筆資料，累計共 ${mappedResultRows.length} 筆。`;

        // Clear uploaded files in selector to prepare for the next drop
        clearUploadedFiles();

        const missingPriceCount = newResultRows.filter(row => row[9] === '').length;
        if (missingPriceCount > 0) {
            infoBox.style.background = 'rgba(239, 68, 68, 0.05)';
            infoBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            infoText.innerHTML = `<span style="color: #ef4444; font-weight: 600;">警告：</span>本次新增的項目中，有 <strong>${missingPriceCount}</strong> 筆單價未能在 EI 檔中尋獲，已呈現在列表底部（紅色標記）。`;
        } else {
            infoBox.style.background = 'rgba(16, 185, 129, 0.05)';
            infoBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            infoText.innerHTML = `<span style="color: #10b981; font-weight: 600;">成功：</span>本次配對檔案對照成功！資料已追加至預覽表，您可以繼續拖曳下一組檔案進行解析，或點擊下方按鈕匯出。`;
        }

    } catch (error) {
        console.error(error);
        statusDot.className = 'status-dot error';
        statusText.textContent = '解析失敗！';
        updateProgress(0, '處理出錯');
        
        infoBox.style.background = 'rgba(239, 68, 68, 0.05)';
        infoBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        infoText.innerHTML = `<span style="color: #ef4444; font-weight: 600;">錯誤訊息：</span>${error.message}`;
        
        // Re-enable clear
        btnClearFiles.disabled = false;
        updateFileSelectorUI();
    }
});

// Render Preview HTML Table
function renderPreviewTable() {
    tableBody.innerHTML = '';
    
    if (mappedResultRows.length === 0) {
        tablePlaceholder.style.display = 'flex';
        dataTable.style.display = 'none';
        previewCount.style.display = 'none';
        btnClearPreview.style.display = 'none';
        return;
    }

    mappedResultRows.forEach((row, index) => {
        const tr = document.createElement('tr');
        row.forEach((cell, idx) => {
            const td = document.createElement('td');
            if (idx === 9) {
                td.textContent = cell !== '' ? cell.toFixed(4) : '未尋獲';
                if (cell === '') td.style.color = '#ef4444';
            } else {
                td.textContent = cell;
            }
            tr.appendChild(td);
        });
        
        // Add Delete Button Column
        const actionTd = document.createElement('td');
        actionTd.className = 'action-column';
        actionTd.innerHTML = `
            <button class="btn-delete-row" data-idx="${index}" title="刪除此筆">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        tr.appendChild(actionTd);
        
        tableBody.appendChild(tr);
    });

    tablePlaceholder.style.display = 'none';
    dataTable.style.display = 'table';
    previewCount.style.display = 'inline-block';
    previewCount.textContent = `${mappedResultRows.length} 筆資料`;
    btnClearPreview.style.display = 'flex';
    
    // Bind click events to delete row buttons
    lucide.createIcons();
    bindRowDeleteEvents();
}

// Bind event listeners for row delete buttons
function bindRowDeleteEvents() {
    const deleteButtons = tableBody.querySelectorAll('.btn-delete-row');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            deleteRow(idx);
        });
    });
}

// Delete an individual row
function deleteRow(idx) {
    mappedResultRows.splice(idx, 1);
    renderPreviewTable();
    updateExportButtons();
    
    statusDot.className = 'status-dot completed';
    statusText.textContent = `已刪除單筆項目。目前累計 ${mappedResultRows.length} 筆資料。`;
}

// Update export buttons disabled/enabled state
function updateExportButtons() {
    const hasData = mappedResultRows.length > 0;
    btnExportXlsx.disabled = !hasData;
    btnExportCsv.disabled = !hasData;
}

// Export XLSX using SheetJS
btnExportXlsx.addEventListener('click', () => {
    if (mappedResultRows.length === 0) return;

    const headers = ['日期', 'STO #', 'Line', 'QSS 料號', '數量', '廠商', '預計入庫倉', '出貨指示類型', 'AI#', '單價'];
    
    // Exclude the Action column by just using mappedResultRows (which doesn't contain the action column at all!)
    const wsData = [headers, ...mappedResultRows];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    XLSX.utils.book_append_sheet(wb, ws, '工作表1');
    XLSX.writeFile(wb, 'template.xlsx');
});

// Export CSV with UTF-8 BOM
btnExportCsv.addEventListener('click', () => {
    if (mappedResultRows.length === 0) return;

    const headers = ['日期', 'STO #', 'Line', 'QSS 料號', '數量', '廠商', '預計入庫倉', '出貨指示類型', 'AI#', '單價'];
    const wsData = [headers, ...mappedResultRows];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    
    // Create Blob with UTF-8 BOM (\ufeff) so Excel reads Chinese columns correctly
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    a.click();
    
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
});
