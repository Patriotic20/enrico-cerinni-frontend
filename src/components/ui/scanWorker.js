// Barcode decoding off the main thread so the camera preview never stutters.
// zxing-cpp (WebAssembly); the .wasm ships in our bundle, no CDN fetch.
import { readBarcodes, prepareZXingModule } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  fireImmediately: true,
});

const FORMATS = ['Code128', 'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'QRCode', 'DataMatrix'];

// Fast pass: ~4x cheaper per frame, so far more frames get a try. Most frames
// either read cleanly or not at all; the thorough pass catches blurred/tilted codes.
const FAST = { formats: FORMATS, tryHarder: false, tryRotate: false, tryInvert: false, tryDownscale: false, maxNumberOfSymbols: 1 };
const THOROUGH = { formats: FORMATS, tryHarder: true, maxNumberOfSymbols: 1 };

self.onmessage = async ({ data: { buffer, width, height, thorough } }) => {
  let text = null;
  let error = null;
  try {
    const image = { data: new Uint8ClampedArray(buffer), width, height, colorSpace: 'srgb' };
    const [hit] = await readBarcodes(image, thorough ? THOROUGH : FAST);
    text = hit?.isValid ? hit.text : null;
  } catch (e) {
    // Usually a bad frame (next one retries), but a decoder that can't start
    // (e.g. CSP blocking WebAssembly) fails every time: report it.
    error = String(e?.message || e);
  }
  self.postMessage({ text, error });
};
