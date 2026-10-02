import { useEffect, useRef, useState } from 'react';
import { X, Flashlight, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';

// Camera needs a secure context (HTTPS or localhost); mediaDevices is undefined otherwise.
export const CAN_SCAN = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

// Retail codes only: fewer formats = faster, fewer false reads.
const FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code', 'data_matrix'];

// Native BarcodeDetector where it exists (Chrome/Android/Edge on Mac); Windows Chrome
// and iOS WebKit have none, so lazy-load the zxing-wasm ponyfill with the same API.
// The .wasm ships in our bundle instead of the default jsDelivr fetch.
const createDetector = async () => {
  if ('BarcodeDetector' in window) {
    const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
    const formats = FORMATS.filter((f) => supported.includes(f));
    if (formats.includes('code_128')) return new window.BarcodeDetector({ formats });
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({ overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } });
  return new BarcodeDetector({ formats: FORMATS });
};

// Default getUserMedia is often 640x480: ~1px per bar on a label, unreadable.
// Ask for 1080p and continuous focus; browsers fall back to what the camera has.
const VIDEO = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' }],
};

// Centre crop that is decoded (fractions of the frame); every 3rd pass scans the
// whole frame in case the code sits outside the guide box.
const ROI = { w: 0.85, h: 0.5 };

// Full-screen rear-camera scanner; calls onDetect once with the first code seen.
export const CameraScanner = ({ onDetect, onClose }) => {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const [caps, setCaps] = useState({});
  const [torch, setTorch] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // Latest callbacks without restarting the camera on every parent render.
  const cb = useRef({ onDetect, onClose });
  cb.current = { onDetect, onClose };

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        const detector = await createDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        trackRef.current = stream.getVideoTracks()[0];
        setCaps(trackRef.current.getCapabilities?.() || {});
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        let pass = 0;
        // Sequential loop: never starts a decode before the previous one finished.
        const tick = async () => {
          if (stopped) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          let source = video;
          if (vw && pass++ % 3 !== 2) {
            const sw = Math.round(vw * ROI.w);
            const sh = Math.round(vh * ROI.h);
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
            source = canvas;
          }
          const codes = vw ? await detector.detect(source).catch(() => []) : [];
          const value = codes[0]?.rawValue?.trim();
          if (value && !stopped) {
            stopped = true;
            navigator.vibrate?.(80);
            cb.current.onDetect(value);
            return;
          }
          timer = setTimeout(tick, 60);
        };
        tick();
      } catch {
        toast.error('Kameraga ruxsat berilmadi');
        cb.current.onClose();
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = () => {
    const next = !torch;
    trackRef.current?.applyConstraints({ advanced: [{ torch: next }] }).then(() => setTorch(next)).catch(() => {});
  };

  // 2x lets the phone sit farther away, where it can focus (iPhone Pro main lens can't focus close).
  const toggleZoom = () => {
    const next = !zoomed;
    const zoom = next ? Math.min(2, caps.zoom.max) : Math.max(1, caps.zoom.min);
    trackRef.current?.applyConstraints({ advanced: [{ zoom }] }).then(() => setZoomed(next)).catch(() => {});
  };

  const roundBtn = 'flex h-12 w-12 items-center justify-center rounded-full shadow-lg active:scale-95';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Shtrix-kod skaneri">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-72 max-w-[85vw] rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
      </div>
      <p className="absolute inset-x-0 top-10 px-6 text-center text-base font-medium text-white">
        Shtrix-kodni ramkaga to'g'rilang
        <span className="mt-1 block text-sm font-normal text-white/70">Xira bo'lsa, telefonni biroz uzoqroq tuting</span>
      </p>
      <div className="absolute bottom-10 inset-x-0 flex items-center justify-center gap-4">
        {caps.torch && (
          <button onClick={toggleTorch} className={`${roundBtn} ${torch ? 'bg-yellow-300 text-gray-900' : 'bg-white/90 text-gray-900'}`} aria-label="Chiroq">
            <Flashlight size={22} />
          </button>
        )}
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-lg active:scale-95"
        >
          <X size={20} /> Yopish
        </button>
        {caps.zoom?.max >= 1.5 && (
          <button onClick={toggleZoom} className={`${roundBtn} ${zoomed ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-900'}`} aria-label="Yaqinlashtirish">
            <ZoomIn size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraScanner;
