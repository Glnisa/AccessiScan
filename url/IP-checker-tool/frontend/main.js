import './style.css'
import * as XLSX from 'xlsx';

const translations = {
    tr: {
        title: "AccessiScan 🔍",
        subtitle: "Excel dosyanızı yükleyin ve URL/IP durumunu anında öğrenin.",
        uploadHint: "Excel dosyasını buraya sürükleyin veya seçin",
        startBtn: "Kontrolü Başlat",
        checkingStatus: "Kontrol ediliyor...",
        accessible: "Erişilebilir",
        inaccessible: "Erişilemez",
        downloadResult: "Excel İndir",
        parsingError: "Excel okunurken hata oluştu!",
        noUrlFound: "Excel dosyasında veri bulunamadı!",
        urlFound: "URL/IP bulundu",
        done: "Kontrol tamamlandı!",
        serverError: "Sunucu hatası",
        modeUrl: "URL Modu",
        modeIp: "IP Modu"
    },
    en: {
        title: "AccessiScan 🔍",
        subtitle: "Upload your Excel file and check URL/IP status instantly.",
        uploadHint: "Drag and drop or select your Excel file here",
        startBtn: "Start Check",
        checkingStatus: "Checking...",
        accessible: "Accessible",
        inaccessible: "Inaccessible",
        downloadResult: "Download Excel",
        parsingError: "Error reading Excel file!",
        noUrlFound: "No data found in the Excel file!",
        urlFound: "URL/IP found",
        done: "Check completed!",
        serverError: "Server error",
        modeUrl: "URL Mode",
        modeIp: "IP Mode"
    }
};

let currentLang = 'tr';
let currentMode = 'url';

const fileInput = document.getElementById('file-input');
const startBtn = document.getElementById('start-btn');
const statusContainer = document.getElementById('status-container');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const resultsArea = document.getElementById('results-area');
const fileNameDisplay = document.getElementById('file-name');

const successCountDisplay = document.getElementById('success-count');
const errorCountDisplay = document.getElementById('error-count');
const downloadSuccessBtn = document.getElementById('download-success');
const downloadErrorBtn = document.getElementById('download-error');

const langBtns = document.querySelectorAll('.lang-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

let urls = [];
let successUrls = [];
let errorUrls = [];

// Localization logic
function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setLanguage(btn.getAttribute('data-lang'));
    });
});

// Mode selection logic
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentMode = btn.getAttribute('data-mode');
        modeBtns.forEach(b => b.classList.toggle('active', b === btn));
        console.log('Mode changed to:', currentMode);
        // Reset data when mode changes
        urls = [];
        fileNameDisplay.textContent = translations[currentLang].uploadHint;
        startBtn.style.display = 'none';
        fileInput.value = '';
    });
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (currentMode === 'url') {
                    urls = jsonData.flat()
                        .filter(cell => cell != null)
                        .map(cell => String(cell).trim())
                        .filter(cell => cell.length > 3 && (cell.includes('.') || cell.includes('http') || cell.toLowerCase().includes('vodafone')));
                } else {
                    // IP Regex for basic validation
                    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                    urls = jsonData.flat()
                        .filter(cell => cell != null)
                        .map(cell => String(cell).trim())
                        .filter(cell => ipRegex.test(cell));
                }

                console.log('Detected items:', urls);

                if (urls.length > 0) {
                    fileNameDisplay.textContent = `${file.name} (${urls.length} ${translations[currentLang].urlFound})`;
                    startBtn.style.display = 'inline-block';
                } else {
                    fileNameDisplay.textContent = translations[currentLang].noUrlFound;
                    startBtn.style.display = 'none';
                }
            } catch (err) {
                console.error('Parsing error:', err);
                fileNameDisplay.textContent = translations[currentLang].parsingError;
            }
        };
        reader.readAsArrayBuffer(file);
    }
});

startBtn.addEventListener('click', async () => {
    if (urls.length === 0) return;

    startBtn.style.display = 'none';
    statusContainer.style.display = 'block';
    resultsArea.style.display = 'none';
    progressBar.style.width = '0%';

    successUrls = [];
    errorUrls = [];

    const batchSize = 50;
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);

        try {
            const response = await fetch('http://localhost:3001/check-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: batch, mode: currentMode })
            });

            if (!response.ok) throw new Error(translations[currentLang].serverError);

            const data = await response.json();

            data.results.forEach(res => {
                if (res.accessible) {
                    successUrls.push(res);
                } else {
                    errorUrls.push(res);
                }
            });

            const processed = Math.min(i + batchSize, urls.length);
            const percent = (processed / urls.length) * 100;
            progressBar.style.width = `${percent}%`;
            statusText.textContent = `${translations[currentLang].checkingStatus} (${processed}/${urls.length})`;

        } catch (error) {
            console.error('Batch error:', error);
            statusText.textContent = `Error: ${error.message}`;
        }
    }

    showResults();
});

function showResults() {
    statusText.textContent = translations[currentLang].done;
    resultsArea.style.display = 'grid';
    successCountDisplay.textContent = `${successUrls.length} ${currentMode === 'url' ? 'URL' : 'IP'}`;
    errorCountDisplay.textContent = `${errorUrls.length} ${currentMode === 'url' ? 'URL' : 'IP'}`;
}

function downloadExcel(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, fileName);
}

downloadSuccessBtn.addEventListener('click', () => {
    downloadExcel(successUrls, `success_${currentMode}s.xlsx`);
});

downloadErrorBtn.addEventListener('click', () => {
    downloadExcel(errorUrls, `error_${currentMode}s.xlsx`);
});

// Initialize title
setLanguage('tr');
