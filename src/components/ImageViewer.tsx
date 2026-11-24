"use client";

import React, { useState } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface ImageViewerProps {
  visible: boolean;
  url: string | null;
  onClose: () => void;
}

export function ImageViewer({ visible, url, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const handleSave = async () => {
    if (!url) return;
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `eqb-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      alert("Failed to save image");
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  if (!visible || !url) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={handleZoomOut} className="p-2 text-white hover:bg-white/10 rounded-full">
            <ZoomOut size={24} />
          </button>
          <button onClick={handleZoomIn} className="p-2 text-white hover:bg-white/10 rounded-full">
            <ZoomIn size={24} />
          </button>
        </div>
        <button onClick={handleSave} className="p-2 text-white hover:bg-white/10 rounded-full" disabled={downloading}>
          {downloading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={24} />
          )}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt="Full size"
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
