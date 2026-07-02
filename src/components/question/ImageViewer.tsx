"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Expand,
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

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;

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
  return (
    <div className={tone === "dark" ? "h-6 w-px bg-white/15" : "h-6 w-px bg-gray-200"} />
  );
}

function Toolbar({
  tone,
  onZoomOut,
  onZoomIn,
  onRotateLeft,
  onRotateRight,
  onReset,
  onOpenFullscreen,
  onCloseFullscreen,
  showFullscreenButton,
  showCloseButton,
  zoomPercent,
  onZoomPercentChange,
  onZoomPercentCommit,
}: {
  tone: ToolbarTone;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onOpenFullscreen?: () => void;
  onCloseFullscreen?: () => void;
  showFullscreenButton?: boolean;
  showCloseButton?: boolean;
  zoomPercent: string;
  onZoomPercentChange: (v: string) => void;
  onZoomPercentCommit: () => void;
}) {
  const isDark = tone === "dark";
  const inputClass = isDark
    ? "w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25 sm:w-20"
    : "w-16 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 sm:w-20";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${isDark ? "text-white" : "text-gray-600"}`}>
      {showCloseButton && onCloseFullscreen && (
        <button
          type="button"
          onClick={onCloseFullscreen}
          className={controlButtonClass(tone)}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className={iconClass(tone)} />
          <span className="text-xs font-medium sm:text-sm">Back</span>
        </button>
      )}

      <button
        type="button"
        onClick={onZoomOut}
        className={controlButtonClass(tone)}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut className={iconClass(tone)} />
        <span className="hidden text-xs font-medium sm:inline">Zoom out</span>
      </button>

      <label className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm">
        <input
          type="number"
          inputMode="numeric"
          min={25}
          max={500}
          step={1}
          value={zoomPercent}
          onChange={(e) => onZoomPercentChange(e.target.value)}
          onBlur={onZoomPercentCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onZoomPercentCommit();
            }
          }}
          className={inputClass}
          aria-label="Zoom percentage"
        />
        <span className={`text-xs ${isDark ? "text-white/70" : "text-gray-500"}`}>%</span>
      </label>

      <button
        type="button"
        onClick={onZoomIn}
        className={controlButtonClass(tone)}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn className={iconClass(tone)} />
        <span className="hidden text-xs font-medium sm:inline">Zoom in</span>
      </button>

      <Divider tone={tone} />

      <button
        type="button"
        onClick={onRotateLeft}
        className={controlButtonClass(tone)}
        title="Rotate counterclockwise"
        aria-label="Rotate counterclockwise"
      >
        <RotateCcw className={iconClass(tone)} />
        <span className="text-xs font-medium sm:text-sm">Rotate left</span>
      </button>

      <button
        type="button"
        onClick={onRotateRight}
        className={controlButtonClass(tone)}
        title="Rotate clockwise"
        aria-label="Rotate clockwise"
      >
        <RotateCw className={iconClass(tone)} />
        <span className="text-xs font-medium sm:text-sm">Rotate right</span>
      </button>

      <button
        type="button"
        onClick={onReset}
        className={controlButtonClass(tone)}
        title="Reset view"
        aria-label="Reset view"
      >
        <span className="text-base leading-none" aria-hidden>
          ↺
        </span>
        <span className="hidden text-xs font-medium sm:inline">Reset</span>
      </button>

      {showFullscreenButton && onOpenFullscreen && (
        <>
          <Divider tone={tone} />
          <button
            type="button"
            onClick={onOpenFullscreen}
            className={controlButtonClass(tone)}
            title="Full screen"
            aria-label="Open full screen"
          >
            <Expand className={iconClass(tone)} />
            <span className="hidden text-xs font-medium sm:inline">Full screen</span>
          </button>
        </>
      )}
    </div>
  );
}

type PointerDragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

export function ImageViewer({ src, alt }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoomPercent, setZoomPercent] = useState("100");
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const positionRef = useRef(position);
  const dragRef = useRef<PointerDragState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const touchRef = useRef({
    isPinching: false,
    startDistance: 0,
    startScale: 1,
    lastTapAt: 0,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    setZoomPercent(String(Math.round(scale * 100)));
  }, [scale]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  }, []);

  const applyScale = useCallback((nextScale: number) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    if (clamped <= 1) {
      setPosition({ x: 0, y: 0 });
      positionRef.current = { x: 0, y: 0 };
    }
  }, []);

  const zoomIn = useCallback(() => {
    applyScale(scale + SCALE_STEP);
  }, [applyScale, scale]);

  const zoomOut = useCallback(() => {
    applyScale(scale - SCALE_STEP);
  }, [applyScale, scale]);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const commitZoomPercent = useCallback(() => {
    const parsed = Number.parseInt(zoomPercent, 10);
    if (Number.isNaN(parsed)) {
      setZoomPercent(String(Math.round(scale * 100)));
      return;
    }
    applyScale(parsed / 100);
  }, [applyScale, scale, zoomPercent]);

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
        touchRef.current.startScale = scale;
        return;
      }

      if (touches.length === 1) {
        const now = Date.now();
        if (now - touchRef.current.lastTapAt < 250) {
          touchRef.current.lastTapAt = 0;
          if (isTouchDevice) {
            setIsOpen(true);
          }
        } else {
          touchRef.current.lastTapAt = now;
          touchRef.current.lastTouchX = touches[0].clientX;
          touchRef.current.lastTouchY = touches[0].clientY;
        }
      }
    },
    [isTouchDevice, scale],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const { touches } = e;
      if (touches.length === 2 && touchRef.current.isPinching) {
        e.preventDefault();
        const distance = getTouchDistance(touches);
        const ratio = distance / touchRef.current.startDistance;
        applyScale(touchRef.current.startScale * ratio);
        return;
      }

      if (touches.length === 1 && scale > 1) {
        e.preventDefault();
        const dx = touches[0].clientX - touchRef.current.lastTouchX;
        const dy = touches[0].clientY - touchRef.current.lastTouchY;
        const nextPosition = {
          x: positionRef.current.x + dx,
          y: positionRef.current.y + dy,
        };
        setPosition(nextPosition);
        positionRef.current = nextPosition;
        touchRef.current.lastTouchX = touches[0].clientX;
        touchRef.current.lastTouchY = touches[0].clientY;
      }
    },
    [applyScale, scale],
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
      if (scale <= 1) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: positionRef.current.x,
        originY: positionRef.current.y,
        moved: false,
      };

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [scale],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current.pointerId !== e.pointerId || scale <= 1) return;

    const nextX = dragRef.current.originX + (e.clientX - dragRef.current.startX);
    const nextY = dragRef.current.originY + (e.clientY - dragRef.current.startY);
    dragRef.current.moved = true;

    const nextPosition = { x: nextX, y: nextY };
    setPosition(nextPosition);
    positionRef.current = nextPosition;
  }, [scale]);

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
        applyScale(scale + 0.1);
      } else {
        applyScale(scale - 0.1);
      }
    },
    [applyScale, scale],
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

  const stageStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  } as const;

  const imageStyle = {
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    transition: "transform 0.2s ease-out",
  } as const;

  const openFullScreen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const shouldOpenFromTap = useCallback(
    (event: React.MouseEvent) => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }
      if (isTouchDevice) {
        event.preventDefault();
        openFullScreen();
      }
    },
    [isTouchDevice, openFullScreen],
  );

  const inlineTouchAction = scale > 1 ? "none" : "pan-y pinch-zoom";

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {alt}
          </p>

          <Toolbar
            tone="light"
            onZoomOut={zoomOut}
            onZoomIn={zoomIn}
            onRotateLeft={rotateLeft}
            onRotateRight={rotateRight}
            onReset={resetView}
            onOpenFullscreen={openFullScreen}
            showFullscreenButton
            zoomPercent={zoomPercent}
            onZoomPercentChange={setZoomPercent}
            onZoomPercentCommit={commitZoomPercent}
          />
        </div>

        <div
          className={`overflow-hidden p-3 sm:p-4 ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
          style={{ touchAction: inlineTouchAction }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onClick={shouldOpenFromTap}
          tabIndex={0}
          role="button"
          aria-label="Tap to open full screen, drag to pan when zoomed"
        >
          <div className="flex items-center justify-center" style={stageStyle}>
            <img
              src={src}
              alt={alt}
              className="w-full h-auto select-none"
              style={imageStyle}
              draggable={false}
            />
          </div>
        </div>

        <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400 sm:hidden">
          Tap to full screen · Pinch to zoom · Drag to pan
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-black p-0 text-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/95 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{alt}</p>
              <p className="hidden text-xs text-white/50 sm:block">Pinch to zoom · Drag to pan</p>
            </div>

            <Toolbar
              tone="dark"
              onZoomOut={zoomOut}
              onZoomIn={zoomIn}
              onRotateLeft={rotateLeft}
              onRotateRight={rotateRight}
              onReset={resetView}
              onCloseFullscreen={() => setIsOpen(false)}
              showCloseButton
              zoomPercent={zoomPercent}
              onZoomPercentChange={setZoomPercent}
              onZoomPercentCommit={commitZoomPercent}
            />
          </div>

          <div
            className="flex min-h-[calc(100dvh-7rem)] flex-1 items-center justify-center overflow-hidden bg-black/95 p-4"
            style={{ touchAction: scale > 1 ? "none" : "pan-y pinch-zoom", ...stageStyle }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointerDrag}
            onPointerCancel={endPointerDrag}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[calc(100dvh-7rem)] max-w-full select-none"
              style={imageStyle}
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
