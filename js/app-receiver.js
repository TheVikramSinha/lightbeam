'use strict';

// SAFETY CHECK: Verify Library Loaded
if (typeof QRCode === 'undefined') {
    alert("CRITICAL ERROR: The QRCode library failed to load. Please check your internet connection or ad-blocker.");
}

// =========================================
// 1. CONFIGURATION & STATE
// =========================================
const CONFIG = {
    CHUNK_SIZE: 1200, 
    DEFAULT_SPEED: 100
};

const state = {
    chunks: [],
    currentIndex: 0,
    isTransmitting: false,
    intervalId: null,
    fileName: ''
};

const elements = {
    fileInput: document.getElementById('fileInput'),
    controls: document.getElementById('controls'),
    canvas: document.getElementById('qr-canvas'),
    speedRange: document.getElementById('speedRange'),
    speedDisplay: document.getElementById('speedDisplay'),
    statusText: document.getElementById('statusText'),
    chunkIndex: document.getElementById('chunkIndex'),
    chunkTotal: document.getElementById('chunkTotal')
};

// =========================================
// 2. CORE LOGIC: CHUNKING
// =========================================

async function prepareFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                // Binary to Base64 (Safe Method)
                const binaryString = Array.from(new Uint8Array(reader.result))
                    .map(byte => String.fromCharCode(byte))
                    .join('');
                
                const base64Data = btoa(binaryString);
                
                const totalLength = base64Data.length;
                const totalChunks = Math.ceil(totalLength / CONFIG.CHUNK_SIZE);
                const generatedChunks = [];

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CONFIG.CHUNK_SIZE;
                    const end = Math.min(start + CONFIG.CHUNK_SIZE, totalLength);
                    const chunkData = base64Data.substring(start, end);

                    const payload = {
                        i: i,
                        t: totalChunks,
                        d: chunkData
                    };
                    
                    if (i === 0) payload.n = file.name;

                    generatedChunks.push(JSON.stringify(payload));
                }
                resolve(generatedChunks);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsArrayBuffer(file);
    });
}

// =========================================
// 3. CORE LOGIC: TRANSMISSION LOOP
// =========================================

function startPulse(speedMs) {
    if (state.intervalId) clearInterval(state.intervalId);

    elements.speedDisplay.innerText = `${speedMs}ms`;

    state.intervalId = setInterval(() => {
        if (state.chunks.length === 0) return;

        const currentData = state.chunks[state.currentIndex];

        try {
            // RENDER QR
            QRCode.toCanvas(elements.canvas, currentData, {
                width: 350,
                margin: 2,
                errorCorrectionLevel: 'L',
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            }, function (error) {
                if (error) console.error("QR Gen Error:", error);
            });
        } catch (e) {
            console.error("Library Error:", e);
            clearInterval(state.intervalId);
            elements.statusText.innerText = "Library Error";
            return;
        }

        elements.chunkIndex.innerText = state.currentIndex + 1;
        state.currentIndex = (state.currentIndex + 1) % state.chunks.length;

    }, speedMs);

    elements.statusText.innerText = "Transmitting (Looping)";
    elements.statusText.style.color = "var(--accent-success)";
}

// =========================================
// 4. EVENT LISTENERS
// =========================================

elements.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    elements.statusText.innerText = "Processing File...";
    elements.statusText.style.color = "var(--accent-primary)";
    
    try {
        state.chunks = await prepareFile(file);
        state.currentIndex = 0;
        state.fileName = file.name;
        
        elements.chunkTotal.innerText = state.chunks.length;
        elements.controls.style.display = 'block';
        
        startPulse(elements.speedRange.value);

    } catch (err) {
        console.error(err);
        alert("Error processing file. See console.");
    }
});

elements.speedRange.addEventListener('input', (e) => {
    const newSpeed = parseInt(e.target.value);
    if (state.chunks.length > 0) {
        startPulse(newSpeed);
    } else {
        elements.speedDisplay.innerText = `${newSpeed}ms`;
    }
});
