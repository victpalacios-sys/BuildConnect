import { useRef, useEffect, useCallback } from 'react';
import type { FloorSection } from './crossSectionMath';

interface CrossSectionCanvasProps {
  sections: FloorSection[];
  groundFloorLevel: number;
}

const PIXELS_PER_METER = 30;

export function CrossSectionCanvas({ sections, groundFloorLevel }: CrossSectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    if (sections.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No intersections found', w / 2, h / 2);
      ctx.restore();
      return;
    }

    const sorted = [...sections].sort((a, b) => a.level - b.level);
    const totalHeight = sorted.reduce((sum, s) => sum + s.height, 0);
    const marginLeft = 80;
    const marginRight = 40;
    const marginTop = 30;
    const marginBottom = 30;
    const drawH = h - marginTop - marginBottom;
    const scale = Math.min(PIXELS_PER_METER, drawH / totalHeight);

    let currentY = marginTop;

    // Draw from top floor to bottom
    const reversed = [...sorted].reverse();
    reversed.forEach((section) => {
      const slabH = section.height * scale;

      // Floor slab line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginLeft, currentY + slabH);
      ctx.lineTo(w - marginRight, currentY + slabH);
      ctx.stroke();

      // Floor label
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(section.label, marginLeft - 8, currentY + slabH / 2 + 4);

      // Height dimension
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${section.height}m`, w - marginRight + 4, currentY + slabH / 2 + 3);

      // Wall sections
      section.walls.forEach((wall) => {
        const x = marginLeft + wall.position * scale;
        const wallW = Math.max(wall.thickness * scale, 3);

        // Check if a door or window intersects this wall
        const hasDoor = section.doors.some((d) => Math.abs(d.position - wall.position) < 0.5);
        const hasWindow = section.windows.some((win) => Math.abs(win.position - wall.position) < 0.5);

        if (hasDoor) {
          // Door: gap from floor to ~2.1m
          const doorHeight = Math.min(2.1, section.height - 0.1);
          // Draw wall above door
          ctx.fillStyle = wall.isExterior ? '#374151' : '#94a3b8';
          ctx.fillRect(x - wallW / 2, currentY, wallW, (section.height - doorHeight) * scale);
        } else if (hasWindow) {
          const win = section.windows.find((w) => Math.abs(w.position - wall.position) < 0.5)!;
          // Wall below window (from floor to sill)
          ctx.fillStyle = wall.isExterior ? '#374151' : '#94a3b8';
          ctx.fillRect(x - wallW / 2, currentY + (section.height - win.sillHeight) * scale, wallW, win.sillHeight * scale);
          // Wall above window
          const windowTop = win.sillHeight + win.height;
          if (windowTop < section.height) {
            ctx.fillRect(x - wallW / 2, currentY, wallW, (section.height - windowTop) * scale);
          }
          // Window glass
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(x - wallW / 2, currentY + (section.height - windowTop) * scale, wallW, win.height * scale);
        } else {
          // Full wall
          ctx.fillStyle = wall.isExterior ? '#374151' : '#94a3b8';
          ctx.fillRect(x - wallW / 2, currentY, wallW, slabH);
        }
      });

      currentY += slabH;
    });

    // Ground line
    const groundY = marginTop + sorted.filter(s => s.level >= groundFloorLevel).reduce((sum, s) => sum + s.height * scale, 0);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(marginLeft - 20, groundY);
    ctx.lineTo(w - marginRight + 20, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#16a34a';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Ground', marginLeft - 24, groundY + 3);

    ctx.restore();
  }, [sections, groundFloorLevel]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      render();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => { render(); }, [render]);

  return (
    <div ref={containerRef} className="w-full h-64">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
