import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface DraggableDocumentViewerProps {
  url: string;
  fileName?: string;
  onClose?: () => void;
}

type ResizeDir = 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw' | null;

export default function DraggableDocumentViewer({ url, fileName, onClose }: DraggableDocumentViewerProps) {
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [size, setSize] = useState({ w: 640, h: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeDir>(null);
  const [scale, setScale] = useState(1);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = Math.min(640, window.innerWidth - 16);
    const h = Math.min(480, window.innerHeight - 60);
    setSize({ w, h });
    setPosition({
      x: Math.max(8, (window.innerWidth - w) / 2),
      y: Math.max(8, (window.innerHeight - h) / 2),
    });
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 640;
    const nh = img.naturalHeight || 480;

    const maxW = Math.min(800, window.innerWidth - 32);
    const maxH = Math.min(window.innerHeight - 80, 700);

    let fitW = Math.min(nw, maxW);
    fitW = Math.max(340, fitW);
    let fitH = Math.round((fitW / nw) * nh) + 40;

    if (fitH > maxH) {
      fitH = maxH;
      fitW = Math.round((fitH - 40) * (nw / nh));
      fitW = Math.max(340, fitW);
    }

    setSize({ w: fitW, h: fitH });
    setPosition({
      x: Math.max(8, (window.innerWidth - fitW) / 2),
      y: Math.max(8, (window.innerHeight - fitH) / 2),
    });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleResizeStart = useCallback((dir: ResizeDir, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(dir);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, px: position.x, py: position.y };
  }, [size, position]);

  useEffect(() => {
    if (isResizing) {
      const handlePointerMove = (e: PointerEvent) => {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const dir = isResizing;
        let newW = size.w, newH = size.h, newX = position.x, newY = position.y;

        if (dir.includes('e')) newW = Math.max(300, resizeStart.current.w + dx);
        if (dir.includes('w')) { newW = Math.max(300, resizeStart.current.w - dx); newX = resizeStart.current.px + (resizeStart.current.w - newW); }
        if (dir.includes('s')) newH = Math.max(200, resizeStart.current.h + dy);
        if (dir.includes('n')) { newH = Math.max(200, resizeStart.current.h - dy); newY = resizeStart.current.py + (resizeStart.current.h - newH); }

        setSize({ w: newW, h: newH });
        setPosition({ x: newX, y: newY });
      };
      const handlePointerUp = () => setIsResizing(null);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [isResizing, size, position]);

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === '=') {
        setScale(s => Math.min(s + 0.15, 3));
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        setScale(s => Math.max(s - 0.15, 0.35));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?)/i.test(url) || url.startsWith('data:image/') || url.startsWith('blob:');
  const isPdf = /\.pdf($|\?)/i.test(url);

  const resizeHandle = (dir: ResizeDir, className: string) => (
    <div
      className={`absolute ${className} z-10`}
      style={{ cursor: dir?.includes('n') && dir?.includes('s') ? 'ns-resize' : dir?.includes('e') && dir?.includes('w') ? 'ew-resize' : dir === 'nw' || dir === 'se' ? 'nwse-resize' : 'nesw-resize', touchAction: 'none' }}
      onPointerDown={(e) => handleResizeStart(dir, e)}
    />
  );

  return (
    <div
      ref={viewerRef}
      className="fixed z-[99999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Resize handles */}
      {resizeHandle('n', '-top-0 left-2 right-2 h-1.5')}
      {resizeHandle('s', '-bottom-0 left-2 right-2 h-1.5')}
      {resizeHandle('w', '-left-0 top-2 bottom-2 w-1.5')}
      {resizeHandle('e', '-right-0 top-2 bottom-2 w-1.5')}
      {resizeHandle('nw', '-top-0 -left-0 w-3 h-3')}
      {resizeHandle('ne', '-top-0 -right-0 w-3 h-3')}
      {resizeHandle('sw', '-bottom-0 -left-0 w-3 h-3')}
      {resizeHandle('se', '-bottom-0 -right-0 w-3 h-3')}

      <div
        className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border cursor-grab active:cursor-grabbing select-none shrink-0 h-[40px]"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
      >
        <span className="text-xs font-semibold text-foreground truncate max-w-[250px]">
          {fileName || 'Document'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.max(s - 0.15, 0.35))}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
            title="Zoom out (Arrow Down / -)"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={() => setScale(s => Math.min(s + 0.15, 3))}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
            title="Zoom in (Arrow Up / +)"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-auto flex items-center justify-center bg-black/5 flex-1 w-full">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} className="flex items-center justify-center w-full h-full">
          {isImage ? (
            <img
              src={url}
              alt="Document"
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain block"
            />
          ) : isPdf ? (
            <iframe src={url} className="w-full h-full min-w-[600px] min-h-[400px]" title="PDF Viewer" />
          ) : (
            <iframe src={url} className="w-full h-full min-w-[600px] min-h-[400px]" title="Document Viewer" />
          )}
        </div>
      </div>
    </div>
  );
}
