'use strict';

// SAFETY CHECK: Verify jsQR Library Loaded
if (typeof jsQR === 'undefined') {
    alert("CRITICAL ERROR: The jsQR library failed to load. Please check internet or use local files.");
}

// =========================================
// 1. CONFIGURATION & STATE
// =========================================
const state = {
    receivedChunks: new Map(),
    totalChunks: 0,
    fileName: null,
    isScanning: false,
    startTime: null,
    bytesReceived: 0
};

const elements = {
    video: document.getElementById('video-preview'),
    canvas: document.getElementById('hidden-canvas'),
    ctx: document.getElementById('hidden-canvas').getContext('2d', { willReadFrequently: true }),
    startBtn: document.getElementById('startBtn'),
    permissionOverlay: document.getElementById('permissionOverlay'),
    scannerUI: document.getElementById('scannerUI'),
    statusText: document.getElementById('statusText'),
    progressBar: document.getElementById('progressBar'),
    chunkCount: document.getElementById('chunkCount'),
    totalCount: document.getElementById('totalCount'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    speedStat: document.getElementById('speedStat')
};

// =========================================
// 2. CORE LOGIC: SCANNING LOOP
// =========================================

if (elements.startBtn) {
    elements.startBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: { ideal: "environment" } } 
            });

            elements.video.srcObject = stream;
            elements.video.setAttribute("playsinline", true);
            await elements.video.play();
            
            elements.permissionOverlay.style.display = 'none';
            elements.scannerUI.style.display = 'block';
            
            state.isScanning = true;
            requestAnimationFrame(scanFrame);

        } catch (err) {
            console.error("Camera Error:", err);
            alert("Camera access failed. Ensure you are on HTTPS.");
        }
    });
}

function scanFrame() {
    if (!state.isScanning) return;

    if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
        elements.canvas.height = elements.video.videoHeight;
        elements.canvas.width = elements.video.videoWidth;
        
        elements.ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
        
        const imageData = elements.ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        
        // DECODE
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            handleDecodedData(code.data);
        }
    }
    requestAnimationFrame(scanFrame);
}

// =========================================
// 3. CORE LOGIC: DATA PROCESSING
// =========================================

function handleDecodedData(jsonString) {
    try {
        const payload = JSON.parse(jsonString);

        if (typeof payload.i === 'undefined' || typeof payload.d === 'undefined') return;

        // Init
        if (state.totalChunks === 0 && payload.t) {
            state.totalChunks = payload.t;
            elements.totalCount.innerText = payload.t;
            state.startTime = Date.now();
        }

        // Filename
        if (payload.n && !state.fileName) {
            state.fileName = payload.n;
            elements.fileNameDisplay.innerText = payload.n;
        }

        // Store
        if (!state.receivedChunks.has(payload.i)) {
            state.receivedChunks.set(payload.i, payload.d);
            state.bytesReceived += payload.d.length;
            updateProgress();
            
            if (state.receivedChunks.size === state.totalChunks) {
                finalizeTransfer();
            }
        }
    } catch (e) { }
}

function updateProgress() {
    const percent = (state.receivedChunks.size / state.totalChunks) * 100;
    elements.progressBar.style.width = `${percent}%`;
    elements.chunkCount.innerText = state.receivedChunks.size;

    const now = Date.now();
    const elapsedSeconds = (now - state.startTime) / 1000;
    if (elapsedSeconds > 0) {
        const kbps = ((state.bytesReceived * 0.75) / 1024) / elapsedSeconds;
        elements.speedStat.innerText = `${kbps.toFixed(1)} KB/s`;
    }
}

function finalizeTransfer() {
    state.isScanning = false;
    elements.statusText.innerText = "Reassembling File...";

    let fullBase64 = "";
    for (let i = 0; i < state.totalChunks; i++) {
        fullBase64 += state.receivedChunks.get(i);
    }

    try {
        const binaryString = atob(fullBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = state.fileName || "received_file";
        document.body.appendChild(a);
        a.click();
        
        elements.statusText.innerText = "Done! ✅";
    } catch (err) {
        alert("Reassembly failed.");
    }
}
