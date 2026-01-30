'use strict';

// =========================================
// 1. CONFIGURATION & STATE
// =========================================
const CONFIG = {
    CHUNK_SIZE: 1200, // Safe limit for standard webcams (creates a manageable QR density)
    DEFAULT_SPEED: 100
};

const state = {
    chunks: [],
    currentIndex: 0,
    isTransmitting: false,
    intervalId: null,
    fileName: ''
};

// DOM Elements
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

/**
 * Converts a File object into an array of QR-ready JSON strings.
 * Handles binary data via Base64 encoding.
 */
async function prepareFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                // 1. Convert Binary Buffer to Base64
                // We map the Uint8Array to a binary string, then btoa() it.
                // This is more memory efficient and safer for arbitrary binary types than simple string manipulation.
                const binaryString = Array.from(new Uint8Array(reader.result))
                    .map(byte => String.fromCharCode(byte))
                    .join('');
                
                const base64Data = btoa(binaryString);
                
                // 2. Split into Chunks
                const totalLength = base64Data.length;
                const totalChunks = Math.ceil(totalLength / CONFIG.CHUNK_SIZE);
                const generatedChunks = [];

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CONFIG.CHUNK_SIZE;
                    const end = Math.min(start + CONFIG.CHUNK_SIZE, totalLength);
                    const chunkData = base64Data.substring(start, end);

                    // 3. Create Payload
                    // Schema: { i: index, t: total, n: name, d: data }
                    // We only send the filename 'n' on the first chunk to save bytes on subsequent frames
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
    // Clear previous loop if active
    if (state.intervalId) clearInterval(state.intervalId);

    // Update Speed Display
    elements.speedDisplay.innerText = `${speedMs}ms`;

    state.intervalId = setInterval(() => {
        if (state.chunks.length === 0) return;

        const currentData = state.chunks[state.currentIndex];

        // Render QR
        QRCode.toCanvas(elements.canvas, currentData, {
            width: 350,
            margin: 2,
            errorCorrectionLevel: 'L', // 'L' (Low) allows for less dense, easier-to-scan codes
            color: {
                dark: "#000000",
                light: "#ffffff"
            }
        }, function (error) {
            if (error) console.error("QR Gen Error:", error);
        });

        // Update UI Counters
        elements.chunkIndex.innerText = state.currentIndex + 1;
        
        // Loop Logic
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

    // UI Feedback
    elements.statusText.innerText = "Processing File...";
    elements.statusText.style.color = "var(--accent-primary)";
    
    try {
        state.chunks = await prepareFile(file);
        state.currentIndex = 0;
        state.fileName = file.name;
        
        // Update UI
        elements.chunkTotal.innerText = state.chunks.length;
        elements.controls.style.display = 'block';
        
        // Auto-start
        startPulse(elements.speedRange.value);

    } catch (err) {
        console.error(err);
        alert("Error processing file. See console.");
    }
});

// Dynamic Speed Adjustment
elements.speedRange.addEventListener('input', (e) => {
    const newSpeed = parseInt(e.target.value);
    if (state.chunks.length > 0) {
        startPulse(newSpeed);
    } else {
        elements.speedDisplay.innerText = `${newSpeed}ms`;
    }
});
