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
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not start the camera. Check camera permission.");
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
        .finally(() => reader.remove());
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
        <div ref={containerRef} className="w-full min-h-[260px] rounded-2xl overflow-hidden bg-gray-100" />
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <p className="text-xs text-gray-500 mt-3">Point your camera at the QR code shown inside a study group.</p>
      </div>
    </div>
  );
}
