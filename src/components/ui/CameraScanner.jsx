import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

// ponytail: native BarcodeDetector (Chrome/Android/Edge). iOS Safari lacks it —
// camera button hides there; add a JS decoder (e.g. zxing) if iPhones matter.
export const CAN_SCAN = typeof window !== 'undefined' && 'BarcodeDetector' in window;

// Full-screen rear-camera scanner; calls onDetect once with the first code seen.
export const CameraScanner = ({ onDetect, onClose }) => {
  const videoRef = useRef(null);
  // Latest callbacks without restarting the camera on every parent render.
  const cb = useRef({ onDetect, onClose });
  cb.current = { onDetect, onClose };

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    const detector = new window.BarcodeDetector();

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        timer = setInterval(async () => {
          const codes = await detector.detect(videoRef.current).catch(() => []);
          if (codes[0]?.rawValue && !stopped) {
            stopped = true;
            navigator.vibrate?.(80);
            cb.current.onDetect(codes[0].rawValue);
          }
        }, 250);
      } catch {
        toast.error('Kameraga ruxsat berilmadi');
        cb.current.onClose();
      }
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Shtrix-kod skaneri">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-72 max-w-[85vw] rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
      </div>
      <p className="absolute inset-x-0 top-10 text-center text-base font-medium text-white">
        Shtrix-kodni ramkaga to'g'rilang
      </p>
      <button
        onClick={onClose}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-lg active:scale-95"
      >
        <X size={20} /> Yopish
      </button>
    </div>
  );
};

export default CameraScanner;
