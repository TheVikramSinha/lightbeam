'use strict';

// =========================================
// 1. CONFIGURATION & STATE
// =========================================
const state = {
    receivedChunks: new Map(), // Stores { index: data }
    totalChunks: 0,
    fileName: null,
    isScanning: false,
    startTime: null,
    lastChunkTime: null,
    bytesReceived: 0
};

// DOM Elements
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

elements.startBtn.addEventListener('click', async () => {
    try {
        // Request Camera Access (Rear camera preferred)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 }, // HD resolution for better QR detail
                height: { ideal: 720 } 
            } 
        });

        // Initialize UI
        elements.video.srcObject = stream;
        elements.video.setAttribute("playsinline", true); // Required for iOS
        elements.video.play();
        
        elements.permissionOverlay.style.display = 'none';
        elements.scannerUI.style.display = 'block';
        
        state.isScanning = true;
        requestAnimationFrame(scanFrame);

    } catch (err) {
        console.error("Camera Error:", err);
        alert("Camera access denied or unavailable. Please ensure you are on HTTPS.");
    }
});

function scanFrame() {
    if (!state.isScanning) return;

    if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
        // Sync canvas size to video stream
        elements.canvas.height = elements.video.videoHeight;
        elements.canvas.width = elements.video.videoWidth;
        
        // Draw current frame
        elements.ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
        
        // Extract pixel data
        const imageData = elements.ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        
        // DECODE: Attempt to find QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert", // Optimization: Assume standard black-on-white QR
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

        // Validation: Ensure it matches our LightBeam schema
        if (typeof payload.i === 'undefined' || typeof payload.d === 'undefined') return;

        // 1. Initialization (First valid chunk encountered)
        if (state.totalChunks === 0 && payload.t) {
            state.totalChunks = payload.t;
            elements.totalCount.innerText = payload.t;
            
            // Start Timer
            state.startTime = Date.now();
        }

        // Capture Filename (sent usually on chunk 0, but could be others depending on logic)
        if (payload.n && !state.fileName) {
            state.fileName = payload.n;
            elements.fileNameDisplay.innerText = payload.n;
        }

        // 2. Storage & Deduplication
        if (!state.receivedChunks.has(payload.i)) {
            state.receivedChunks.set(payload.i, payload.d);
            state.bytesReceived += payload.d.length; // Approximate size
            
            updateProgress();
            
            // 3. Completion Check
            if (state.receivedChunks.size === state.totalChunks) {
                finalizeTransfer();
            }
        }

    } catch (e) {
        // Ignore non-JSON QR codes (random clutter)
    }
}

function updateProgress() {
    // Progress Bar
    const percent = (state.receivedChunks.size / state.totalChunks) * 100;
    elements.progressBar.style.width = `${percent}%`;
    elements.chunkCount.innerText = state.receivedChunks.size;

    // Speed Calculation
    const now = Date.now();
    const elapsedSeconds = (now - state.startTime) / 1000;
    
    if (elapsedSeconds > 0) {
        // Base64 is ~1.33x larger than binary. We calculate approx binary KB/s
        const estimatedBinarySize = state.bytesReceived * 0.75; 
        const kbps = (estimatedBinarySize / 1024) / elapsedSeconds;
        elements.speedStat.innerText = `${kbps.toFixed(1)} KB/s`;
    }
}

// =========================================
// 4. CORE LOGIC: REASSEMBLY & DOWNLOAD
// =========================================

function finalizeTransfer() {
    state.isScanning = false;
    elements.statusText.innerText = "Reassembling File...";
    elements.statusText.style.color = "var(--accent-primary)";

    // 1. Sort & Join
    // We must iterate 0..totalChunks to ensure order
    let fullBase64 = "";
    for (let i = 0; i < state.totalChunks; i++) {
        fullBase64 += state.receivedChunks.get(i);
    }

    // 2. Convert Base64 -> Binary -> Blob
    try {
        const binaryString = atob(fullBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        // 3. Trigger Download
        const a = document.createElement('a');
        a.href = url;
        a.download = state.fileName || "lightbeam-received-file";
        document.body.appendChild(a); // Required for Firefox
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            elements.statusText.innerText = "Transfer Complete! ✅";
        }, 100);

    } catch (err) {
        console.error("Reassembly Error:", err);
        elements.statusText.innerText = "Error in Reassembly";
        elements.statusText.style.color = "var(--accent-alert)";
    }
}
