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
  return tone === "dark"
    ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
    : "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100";
}

function iconClass(tone: ToolbarTone) {
  return tone === "dark" ? "h-4 w-4 text-white" : "h-4 w-4 text-gray-600";
}

function Divider({ tone }: { tone: ToolbarTone }) {
  return <div className={tone === "dark" ? "h-5 w-px bg-white/15" : "h-5 w-px bg-gray-200"} />;
}

function Toolbar({
  tone,
  scale,
  zoomInput,
  onZoomInputChange,
  onZoomInputCommit,
  onZoomOut,
  onZoomIn,
  onRotateLeft,
  onRotateRight,
  onReset,
  onOpenFullscreen,
  onCloseFullscreen,
  showFullscreenButton,
  showCloseButton,
}: {
  tone: ToolbarTone;
  scale: number;
  zoomInput: string;
  onZoomInputChange: (value: string) => void;
  onZoomInputCommit: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onOpenFullscreen?: () => void;
  onCloseFullscreen?: () => void;
  showFullscreenButton?: boolean;
  showCloseButton?: boolean;
}) {
  const isDark = tone === "dark";
  const zoomTextClass = isDark
    ? "w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/25"
    : "w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-800 outline-none ring-0 placeholder:text-gray-400 focus:border-gray-300";

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${isDark ? "text-white" : "text-gray-600"}`}
    >
      {showCloseButton && onCloseFullscreen && (
        <button
          type="button"
          onClick={onCloseFullscreen}
          className={controlButtonClass(tone)}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className={iconClass(tone)} />
          <span>Back</span>
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
        <span className="hidden sm:inline">Zoom out</span>
      </button>

      <label className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${isDark ? "text-white/85" : "text-gray-600"}`}>
        <span className="sr-only">Zoom percentage</span>
        <input
          type="number"
          inputMode="numeric"
          min={25}
          max={500}
          step={1}
          value={zoomInput}
          onChange={(e) => onZoomInputChange(e.target.value)}
          onBlur={onZoomInputCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onZoomInputCommit();
            }
          }}
          className={zoomTextClass}
          aria-label="Zoom percentage"
        />
        <span>%</span>
      </label>

      <button
        type="button"
        onClick={onZoomIn}
        className={controlButtonClass(tone)}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn className={iconClass(tone)} />
        <span className="hidden sm:inline">Zoom in</span>
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
        <span className="hidden sm:inline">Rotate left</span>
      </button>

      <button
        type="button"
        onClick={onRotateRight}
        className={controlButtonClass(tone)}
        title="Rotate clockwise"
        aria-label="Rotate clockwise"
      >
        <RotateCw className={iconClass(tone)} />
        <span className="hidden sm:inline">Rotate right</span>
      </button>

      <button
        type="button"
        onClick={onReset}
        className={controlButtonClass(tone)}
        title="Reset view"
        aria-label="Reset view"
      >
        <span className="text-base leading-none">↺</span>
        <span className="hidden sm:inline">Reset</span>
      </button>

      {showFullscreenButton && onOpenFullscreen && (
        <>
          <Divider tone={tone} />
          <button
            type="button"
            onClick={onOpenFullscreen}
            className={controlButtonClass(tone)}
            title="Open full screen"
            aria-label="Open full screen"
          >
            <Expand className={iconClass(tone)} />
            <span className="hidden sm:inline">Full screen</span>
          </button>
        </>
      )}
    </div>
  );
}

export function ImageViewer({ src, alt }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [zoomInput, setZoomInput] = useState("100");
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
  });

  useEffect(() => {
    setZoomInput(String(Math.round(scale * 100)));
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
  }, []);

  const setScaleAndClamp = useCallback((nextScale: number) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    if (clamped <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, []);

  const zoomIn = useCallback(() => {
    setScaleAndClamp(scale + SCALE_STEP);
  }, [scale, setScaleAndClamp]);

  const zoomOut = useCallback(() => {
    setScaleAndClamp(scale - SCALE_STEP);
  }, [scale, setScaleAndClamp]);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const commitZoomInput = useCallback(() => {
    const parsed = Number.parseInt(zoomInput, 10);
    if (Number.isNaN(parsed)) {
      setZoomInput(String(Math.round(scale * 100)));
      return;
    }
    const nextScale = clamp(parsed / 100, MIN_SCALE, MAX_SCALE);
    setScale(nextScale);
    if (nextScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, zoomInput]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (scale <= 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
      moved: false,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [position.x, position.y, scale]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging || dragState.current.pointerId !== e.pointerId || scale <= 1) return;

    const nextX = e.clientX - dragState.current.startX;
    const nextY = e.clientY - dragState.current.startY;
    if (Math.abs(nextX - position.x) > 2 || Math.abs(nextY - position.y) > 2) {
      dragState.current.moved = true;
    }

    setPosition({ x: nextX, y: nextY });
  }, [isDragging, position.x, position.y, scale]);

  const endPointerDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragState.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture release errors.
      }
      setIsDragging(false);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScaleAndClamp(scale + 0.1);
    } else {
      setScaleAndClamp(scale - 0.1);
    }
  }, [scale, setScaleAndClamp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
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
  }, [rotateLeft, rotateRight, resetView, zoomIn, zoomOut]);

  const handleImageClick = useCallback(() => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }

    if (isTouchDevice) {
      setIsOpen(true);
    }
  }, [isTouchDevice]);

  const viewerStageStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  } as const;

  const imageStyle = {
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    transition: isDragging ? "none" : "transform 0.2s ease-out",
  } as const;

  const renderStage = (fullScreen: boolean) => (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-[calc(100dvh-7rem)] flex-1 bg-black/95 p-4" : "overflow-hidden bg-white p-3 sm:p-4"
      }`}
    >
      <div
        className={`relative flex items-center justify-center ${
          fullScreen ? "w-full h-full" : "w-full"
        }`}
        style={viewerStageStyle}
      >
        <img
          src={src}
          alt={alt}
          className={`select-none ${fullScreen ? "max-h-[calc(100dvh-7rem)] max-w-full" : "w-full h-auto"}`}
          style={imageStyle}
          draggable={false}
        />
      </div>
    </div>
  );

  const renderInlineViewer = () => (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {alt}
        </p>
        <Toolbar
          tone="light"
          scale={scale}
          zoomInput={zoomInput}
          onZoomInputChange={setZoomInput}
          onZoomInputCommit={commitZoomInput}
          onZoomOut={zoomOut}
          onZoomIn={zoomIn}
          onRotateLeft={rotateLeft}
          onRotateRight={rotateRight}
          onReset={resetView}
          onOpenFullscreen={() => setIsOpen(true)}
          showFullscreenButton
          showCloseButton={false}
        />
      </div>

      {isTouchDevice && (
        <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 sm:hidden">
          Tap the image to open full screen, then drag to pan after zooming.
        </div>
      )}

      <div
        className={`overflow-hidden ${
          scale > 1 ? "cursor-grab active:cursor-grabbing touch-none" : "cursor-zoom-in"
        }`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onClick={handleImageClick}
        role="button"
        aria-label="Open image viewer"
      >
        <div className="flex items-center justify-center p-3 sm:p-4" style={viewerStageStyle}>
          <img
            src={src}
            alt={alt}
            className="w-full h-auto select-none"
            style={imageStyle}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderInlineViewer()}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-black p-0 text-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/95 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{alt}</p>
              <p className="text-xs text-white/60">Drag to pan after zooming</p>
            </div>
            <Toolbar
              tone="dark"
              scale={scale}
              zoomInput={zoomInput}
              onZoomInputChange={setZoomInput}
              onZoomInputCommit={commitZoomInput}
              onZoomOut={zoomOut}
              onZoomIn={zoomIn}
              onRotateLeft={rotateLeft}
              onRotateRight={rotateRight}
              onReset={resetView}
              onCloseFullscreen={() => setIsOpen(false)}
              showCloseButton
              showFullscreenButton={false}
            />
          </div>

          {renderStage(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
