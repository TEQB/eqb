"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

export function GroupQrScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let scannerStarted = false;
    const readerId = `study-group-qr-reader-${Math.random().toString(36).slice(2, 10)}`;
    const reader = document.createElement("div");
    reader.id = readerId;
    reader.style.width = "100%";
    reader.style.height = "260px";
    container.appendChild(reader);

    const scanner = new Html5Qrcode(readerId);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (!cancelled) onScanRef.current(decoded.trim());
        },
        () => {},
      )
      .then(() => {
        scannerStarted = true;
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e?.message || "Could not start the camera.";
          if (msg.includes("Permission") || msg.includes("denied") || msg.includes("not allowed")) {
            setError("Camera permission denied. Please allow camera access or use the invite code instead.");
          } else {
            setError(msg);
          }
        }
      });

    return () => {
      cancelled = true;
      if (scannerStarted) {
        setTimeout(() => {
          try {
            scanner
              .stop()
              .then(() => scanner.clear())
              .catch(() => {})
              .finally(() => reader.remove());
          } catch {
            reader.remove();
          }
        }, 0);
      } else {
        reader.remove();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Scan group QR code</h2>
          <button onClick={() => onCloseRef.current()} className="text-gray-500 hover:text-gray-800 p-1">
            <X size={20} />
          </button>
        </div>
        <div ref={containerRef} className="w-full min-h-[260px] rounded-2xl overflow-hidden bg-gray-100">
          {error && (
            <div className="flex flex-col items-center justify-center h-[260px] text-center p-4">
              <p className="text-gray-600 mb-3">{error}</p>
              <p className="text-xs text-gray-400">Close this dialog and use the invite code field instead.</p>
            </div>
          )}
        </div>
        {!error && <p className="text-xs text-gray-500 mt-3">Point your camera at the QR code shown inside a study group.</p>}
      </div>
    </div>
  );
}
