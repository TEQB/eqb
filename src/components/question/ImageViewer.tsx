"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FlipHorizontal2 as FlipHorizontal,
  Maximize,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageViewerProps {
  src: string;
  alt: string;
}

type ToolbarTone = "light" | "dark";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function controlButtonClass(tone: ToolbarTone) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:scale-95";
  return tone === "dark"
    ? `${base} text-white hover:bg-white/10`
    : `${base} text-gray-700 hover:bg-gray-100`;
}

function iconClass(tone: ToolbarTone) {
  return tone === "dark" ? "h-5 w-5 text-white" : "h-5 w-5 text-gray-600";
}

function Divider({ tone }: { tone: ToolbarTone }) {
  return <div className={tone === "dark" ? "h-6 w-px bg-white/15" : "h-6 w-px bg-gray-200"} />;
}

function Toolbar({
  tone,
  zoom,
  onZoomOut,
  onZoomIn,
  onRotateLeft,
  onRotateRight,
  onFlipHorizontal,
  onReset,
  onToggleFullscreen,
  fullscreenOpen,
}: {
  tone: ToolbarTone;
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFlipHorizontal: () => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
  fullscreenOpen: boolean;
}) {
  const isDark = tone === "dark";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${isDark ? "text-white" : "text-gray-600"}`}>
      <button
        type="button"
        onClick={onZoomOut}
        className={controlButtonClass(tone)}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut className={iconClass(tone)} />
      </button>

      <span
        className={`min-w-14 rounded-lg px-2 py-2 text-center text-sm font-medium tabular-nums ${
          isDark ? "text-white/85" : "text-gray-700"
        }`}
        aria-label="Zoom percentage"
      >
        {Math.round(zoom * 100)}%
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        className={controlButtonClass(tone)}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn className={iconClass(tone)} />
      </button>

      <Divider tone={tone} />

      <button
        type="button"
        onClick={onRotateLeft}
        className={controlButtonClass(tone)}
        title="Rotate left"
        aria-label="Rotate left"
      >
        <RotateCcw className={iconClass(tone)} />
      </button>

      <button
        type="button"
        onClick={onRotateRight}
        className={controlButtonClass(tone)}
        title="Rotate right"
        aria-label="Rotate right"
      >
        <RotateCw className={iconClass(tone)} />
      </button>

      <button
        type="button"
        onClick={onFlipHorizontal}
        className={controlButtonClass(tone)}
        title="Flip horizontal"
        aria-label="Flip horizontal"
      >
        <FlipHorizontal className={iconClass(tone)} />
      </button>

      <button
        type="button"
        onClick={onReset}
        className={controlButtonClass(tone)}
        title="Reset view"
        aria-label="Reset view"
      >
        <RefreshCw className={iconClass(tone)} />
      </button>

      <button
        type="button"
        onClick={onToggleFullscreen}
        className={controlButtonClass(tone)}
        title={fullscreenOpen ? "Exit fullscreen" : "Fullscreen"}
        aria-label={fullscreenOpen ? "Exit fullscreen" : "Fullscreen"}
      >
        <Maximize className={iconClass(tone)} />
      </button>
    </div>
  );
}

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type TouchState = {
  isPinching: boolean;
  startDistance: number;
  startZoom: number;
  lastTapAt: number;
  lastTouchX: number;
  lastTouchY: number;
};

export function ImageViewer({ src, alt }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flippedHorizontal, setFlippedHorizontal] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const panRef = useRef(pan);
  const dragRef = useRef<DragState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const touchRef = useRef<TouchState>({
    isPinching: false,
    startDistance: 0,
    startZoom: 1,
    lastTapAt: 0,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setFlippedHorizontal(false);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    resetView();
    setIsFullscreen(false);
  }, [src, resetView]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const updateZoom = useCallback((nextZoom: number) => {
    const clamped = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
    }
  }, []);

  const zoomIn = useCallback(() => {
    updateZoom(zoom + ZOOM_STEP);
  }, [updateZoom, zoom]);

  const zoomOut = useCallback(() => {
    updateZoom(zoom - ZOOM_STEP);
  }, [updateZoom, zoom]);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => ((prev - 90) % 360 + 360) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const flipHorizontal = useCallback(() => {
    setFlippedHorizontal((prev) => !prev);
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const { touches } = e;

      if (touches.length === 2) {
        touchRef.current.isPinching = true;
        touchRef.current.startDistance = getTouchDistance(touches);
        touchRef.current.startZoom = zoom;
        return;
      }

      if (touches.length === 1) {
        const now = Date.now();
        if (now - touchRef.current.lastTapAt < 280) {
          touchRef.current.lastTapAt = 0;
          if (isTouchDevice) setIsFullscreen(true);
          return;
        }

        touchRef.current.lastTapAt = now;
        touchRef.current.lastTouchX = touches[0].clientX;
        touchRef.current.lastTouchY = touches[0].clientY;
      }
    },
    [isTouchDevice, zoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const { touches } = e;

      if (touches.length === 2 && touchRef.current.isPinching) {
        e.preventDefault();
        const distance = getTouchDistance(touches);
        const ratio = distance / touchRef.current.startDistance;
        updateZoom(touchRef.current.startZoom * ratio);
        return;
      }

      if (touches.length === 1 && zoom > 1) {
        e.preventDefault();
        const dx = touches[0].clientX - touchRef.current.lastTouchX;
        const dy = touches[0].clientY - touchRef.current.lastTouchY;
        const nextPan = {
          x: panRef.current.x + dx,
          y: panRef.current.y + dy,
        };
        setPan(nextPan);
        panRef.current = nextPan;
        touchRef.current.lastTouchX = touches[0].clientX;
        touchRef.current.lastTouchY = touches[0].clientY;
      }
    },
    [updateZoom, zoom],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length < 2) {
      touchRef.current.isPinching = false;
    }
    if (e.touches.length === 1) {
      touchRef.current.lastTouchX = e.touches[0].clientX;
      touchRef.current.lastTouchY = e.touches[0].clientY;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (zoom <= 1) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
        moved: false,
      };

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [zoom],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (dragRef.current.pointerId !== e.pointerId || zoom <= 1) return;

      const nextPan = {
        x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
      };
      dragRef.current.moved = true;
      setPan(nextPan);
      panRef.current = nextPan;
    },
    [zoom],
  );

  const endPointerDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.pointerId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture release errors.
      }
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    },
    [zoomIn, zoomOut],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "+" || (e.ctrlKey && e.key === "=")) {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || (e.ctrlKey && e.key === "_")) {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "[") {
        e.preventDefault();
        rotateLeft();
      } else if (e.key === "]") {
        e.preventDefault();
        rotateRight();
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      }
    },
    [resetView, rotateLeft, rotateRight, zoomIn, zoomOut],
  );

  const imageTransformSingle = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg) scaleX(${flippedHorizontal ? -1 : 1})`;
  const zoomTouchAction = zoom > 1 ? "none" : "pan-y pinch-zoom";

  const openFullscreen = useCallback(() => setIsFullscreen(true), []);
  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  const shouldOpenFullscreenFromTap = useCallback(
    (event: React.MouseEvent) => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }

      if (isTouchDevice) {
        event.preventDefault();
        openFullscreen();
      }
    },
    [isTouchDevice, openFullscreen],
  );

  const renderImage = (isFullscreenStage: boolean) => (
    <div
      className={`flex items-center justify-center overflow-hidden ${
        isFullscreenStage ? "min-h-[calc(100dvh-7rem)] flex-1 bg-black/95 p-4" : "p-3 sm:p-4"
      } ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
      style={{ touchAction: zoomTouchAction }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerDrag}
      onPointerCancel={endPointerDrag}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onClick={shouldOpenFullscreenFromTap}
      role="button"
      tabIndex={0}
      aria-label="Tap to open full screen, drag to pan when zoomed"
    >
      <div className="flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className={`select-none ${isFullscreenStage ? "max-h-[calc(100dvh-7rem)] max-w-full" : "w-full h-auto"}`}
          style={{
            transform: imageTransformSingle,
            transformOrigin: "center center",
            transition: "transform 0.2s ease-out",
          }}
          draggable={false}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {alt}
          </p>

          <Toolbar
            tone="light"
            zoom={zoom}
            onZoomOut={zoomOut}
            onZoomIn={zoomIn}
            onRotateLeft={rotateLeft}
            onRotateRight={rotateRight}
            onFlipHorizontal={flipHorizontal}
            onReset={resetView}
            onToggleFullscreen={isFullscreen ? closeFullscreen : openFullscreen}
            fullscreenOpen={isFullscreen}
          />
        </div>

        {renderImage(false)}

        <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400 sm:hidden">
          Tap to full screen · Pinch to zoom · Drag to pan
        </p>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-black p-0 text-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/95 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={closeFullscreen}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
              <span className="text-xs font-medium sm:text-sm">Back</span>
            </button>

            <Toolbar
              tone="dark"
              zoom={zoom}
              onZoomOut={zoomOut}
              onZoomIn={zoomIn}
              onRotateLeft={rotateLeft}
              onRotateRight={rotateRight}
              onFlipHorizontal={flipHorizontal}
              onReset={resetView}
              onToggleFullscreen={closeFullscreen}
              fullscreenOpen={isFullscreen}
            />
          </div>

          {renderImage(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
