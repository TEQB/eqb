"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageViewerProps {
  src: string;
  alt: string;
}

export function ImageViewer({ src, alt }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.25, 0.25);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.1, 5));
    } else {
      setScale((prev) => {
        const newScale = Math.max(prev - 0.1, 0.25);
        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
    }
  }, []);

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {alt}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="Zoom out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="Zoom in"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={rotateLeft}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="Rotate left"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a9.5 9.5 0 11-18.9-4.5 9.5 9.5 0 0117.4 3.1L21 12m-1.5-5.5l4 4m-4 0l4-4" />
              </svg>
            </button>
            <button
              onClick={rotateRight}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="Rotate right"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a9.5 9.5 0 1018.9-4.5 9.5 9.5 0 01-17.4 3.1L3 12m1.5 5.5l4-4m-4 0l4 4" />
              </svg>
            </button>
            {(scale !== 1 || rotation !== 0) && (
              <>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                  onClick={resetView}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Reset view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </button>
              </>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={() => setIsOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="View fullscreen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m4.5 0v4.5m0-4.5h-4.5M3.75 13.5v4.5m0-4.5h4.5m4.5 0v4.5m0-4.5h-4.5M16.5 3.75V8.25m0 0H12m4.5 0h4.5m-4.5 4.5v4.5m0-4.5h-4.5M16.5 13.5H12m4.5 0h4.5m-4.5 4.5v4.5m0-4.5h-4.5" />
              </svg>
            </button>
          </div>
        </div>
        <div
          className="overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-auto"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            draggable={false}
          />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/50">
            <p className="text-sm font-medium text-white">{alt}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
                title="Zoom out"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                </svg>
              </button>
              <span className="text-xs text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={zoomIn}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
                title="Zoom in"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <button
                onClick={rotateLeft}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
                title="Rotate left"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a9.5 9.5 0 11-18.9-4.5 9.5 9.5 0 0117.4 3.1L21 12m-1.5-5.5l4 4m-4 0l4-4" />
                </svg>
              </button>
              <button
                onClick={rotateRight}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
                title="Rotate right"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a9.5 9.5 0 1018.9-4.5 9.5 9.5 0 01-17.4 3.1L3 12m1.5 5.5l4-4m-4 0l4 4" />
                </svg>
              </button>
              {(scale !== 1 || rotation !== 0) && (
                <>
                  <div className="w-px h-4 bg-gray-700 mx-1" />
                  <button
                    onClick={resetView}
                    className="p-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
                    title="Reset view"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            className="overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}