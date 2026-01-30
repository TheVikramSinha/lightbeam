# LightBeam ⚡👁️

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web%20|%20PWA-orange.svg)
![Security](https://img.shields.io/badge/security-Air--Gapped-green.svg)

**LightBeam** is an optical, air-gapped file transfer tool that runs entirely in the browser. It transmits data from Device A to Device B using only screen luminosity (QR codes) and the camera, requiring **zero internet, zero Bluetooth, and zero physical cables**.

**Live Demo:** [https://thevikramsinha.github.io/lightbeam/](https://thevikramsinha.github.io/lightbeam/)

---

## 📖 The Concept
In high-security environments or "digital dead zones," traditional transport layers (WiFi, NFC, USB) are often restricted or unavailable. 

LightBeam treats the camera as a high-speed optical receiver. It converts binary files into a stream of rapid-fire QR codes (the "Sender"), which are then captured, decoded, and reassembled by the "Receiver" device. This creates a true **unidirectional, air-gapped data bridge**.

## 🚀 Key Features
* **Zero Backend:** No servers, no WebSockets, no WebRTC signaling. Logic is 100% client-side.
* **Air-Gapped:** Works in Airplane Mode. No data leaves your device.
* **PWA Ready:** Installable on iOS/Android as a standalone offline app.
* **Binary Safe:** Capable of transferring Images, PDFs, and Zip archives via Base64 chunking.
* **Privacy First:** Strict Content Security Policy (CSP), no analytics trackers, no third-party font requests.

## 🛠️ Architecture

### The Transport Layer (Optical Loop)
1.  **Ingest:** The Sender accepts a `File` object and converts it to an `ArrayBuffer`.
2.  **Encoding:** The buffer is converted to a Base64 string to ensure binary fidelity.
3.  **Chunking:** The string is split into **1.2KB payloads** to optimize for standard webcam resolution (720p).
4.  **Sequencing:** Each chunk is wrapped in a JSON header: `{ "i": index, "t": total, "d": data }`.
5.  **Transmission:** The Sender loops through these chunks, rendering them as QR codes on a generic HTML5 Canvas.

### The Reassembly Engine
1.  **Scanning:** The Receiver polls the camera feed (via `requestAnimationFrame`) looking for QR patterns.
2.  **Deduplication:** Decoded chunks are stored in a `Map` using their Index ID (`i`) to prevent duplicates from the looping stream.
3.  **Reconstruction:** Once `Map.size === TotalChunks`, the Base64 strings are concatenated, converted back to `Uint8Array`, and effectively "downloaded" as a Blob.

## 📦 Installation & Usage

### Online (GitHub Pages)
1.  Visit [thevikramsinha.github.io/lightbeam](https://thevikramsinha.github.io/lightbeam/) on both devices.
2.  **Optional:** Disconnect from the internet (Airplane Mode) to verify security.

### Local Development
Clone the repository to run it locally:

```bash
git clone [https://github.com/thevikramsinha/lightbeam.git](https://github.com/thevikramsinha/lightbeam.git)
cd lightbeam
# Use any static server (e.g., Python, VS Code Live Server)
python3 -m http.server 8080


---

## 💡 Intended Use Cases
LightBeam is architected for **high-security, low-bandwidth** scenarios where physical isolation (air-gapping) is a strict requirement. It is not designed to replace general-purpose file sharing tools like WiFi Direct or Bluetooth.

### 1. Cold Storage Key Transport (The "Crypto Bridge")
* **Scenario:** You have generated a private key or seed phrase on a permanently offline machine (cold storage) to ensure it never touches the internet.
* **Use Case:** Use LightBeam to flash the 64-character key or JSON keystore file to your mobile wallet.
* **Advantage:** Eliminates the risk of USB malware or keyloggers intercepting the data during transfer.

### 2. Password Manager Synchronization
* **Scenario:** You need to transfer a specific, complex password or a small `.kdbx` database update from a secure terminal to a personal device.
* **Use Case:** Transmit the credential string or file optically.
* **Advantage:** No digital footprint; the data exists only as light for the duration of the transfer.

### 3. The "Digital Dead Drop"
* **Scenario:** Leaving a message or file for a recipient without exchanging contact details or pairing devices.
* **Use Case:** The Sender leaves the loop running on a screen. The Receiver walks by, scans the stream, and captures the data without ever establishing a handshake or log entry.

---

## ⚠️ Limitations & Legal Disclaimer

### Technical Constraints
* **Throughput:** This protocol operates at optical speeds (approx. **10KB - 50KB/s**). It is **not suitable** for large files (videos, high-res images, or large binaries).
* **Environmental Factors:** Performance is heavily dependent on screen brightness, camera autofocus speed, and ambient lighting. Glare or reflections can cause packet loss, forcing the receiver to wait for the loop to cycle.
* **Reliability:** Due to the unidirectional nature of the protocol (UDP-style broadcast), there is no feedback loop. The Receiver cannot request a "retry" for a specific chunk; it must wait for the Sender to broadcast that chunk again.

### Legal Disclaimer
**This software is provided "as is", without warranty of any kind, express or implied.** By using LightBeam, you acknowledge that:
1.  **Not for Mission-Critical Data:** This tool should not be relied upon for the transfer of life-critical, medical, or time-sensitive emergency data.
2.  **No Liability:** The authors and contributors are not liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.
3.  **Experimental Nature:** This is a proof-of-concept implementation of optical air-gapped transmission and may not meet industry standards for encryption or error correction.

*Use responsibly and at your own risk.*
