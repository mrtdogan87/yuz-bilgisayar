"use client";

import { useEffect, useRef, useState } from "react";

type PlacedDonor = {
  id: string;
  name: string;
  computerCount: number;
  logoUrl: string | null;
  websiteUrl: string | null;
  bgColor: string | null;
  row: number;
  col: number;
  width: number;
  height: number;
};

type WallSettings = {
  gridCols: number;
  gridRows: number;
  brandColor: string;
  borderColor: string;
  gridColor: string;
};

type Props = {
  placed: PlacedDonor[];
  settings: WallSettings;
  wallRef?: React.RefObject<HTMLDivElement | null>;
};

// Palette tuned to sit on MCBU teal (#06a7bc) background — warm/contrast tones
const PALETTE = [
  "#FFC857", "#FFFFFF", "#F97316", "#FDE68A",
  "#FCA5A5", "#E879F9", "#A7F3D0", "#FBBF24",
  "#FECACA", "#C4B5FD", "#FEF08A", "#FDBA74",
];

export default function DonationWall({ placed, settings, wallRef }: Props) {
  const { gridCols, gridRows, brandColor, gridColor } = settings;
  const [hovered, setHovered] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(56);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.clientWidth - 4;
      const size = Math.floor(available / gridCols);
      setCellSize(Math.max(24, Math.min(64, size)));
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [gridCols]);

  const occupiedMap = new Map<string, PlacedDonor>();
  for (const p of placed) {
    for (let dr = 0; dr < p.height; dr++) {
      for (let dc = 0; dc < p.width; dc++) {
        occupiedMap.set(`${p.row + dr},${p.col + dc}`, p);
      }
    }
  }

  const drawnIds = new Set<string>();

  const gridW = gridCols * cellSize;
  const gridH = gridRows * cellSize;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <div
        ref={wallRef as React.RefObject<HTMLDivElement>}
        style={{
          position: "relative",
          width: gridW,
          height: gridH,
          background: brandColor,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Grid lines */}
        {Array.from({ length: gridRows }).map((_, r) =>
          Array.from({ length: gridCols }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize - 1,
                height: cellSize - 1,
                border: `1px solid ${gridColor}22`,
                boxSizing: "border-box",
              }}
            />
          ))
        )}

        {/* Placed donors */}
        {placed.map((p) => {
          if (drawnIds.has(p.id)) return null;
          drawnIds.add(p.id);

          const colorIndex = placed.indexOf(p) % PALETTE.length;
          const color = p.bgColor || PALETTE[colorIndex];
          const isHovered = hovered === p.id;
          const showName = p.height * cellSize >= 40 || p.width * cellSize >= 80;

          const block = (
            <div
              key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "absolute",
                left: p.col * cellSize + 2,
                top: p.row * cellSize + 2,
                width: p.width * cellSize - 4,
                height: p.height * cellSize - 4,
                background: color,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                cursor: p.websiteUrl ? "pointer" : "default",
                transition: "left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s, box-shadow 0.15s",
                transform: isHovered ? "scale(1.03)" : "scale(1)",
                boxShadow: isHovered ? `0 4px 20px ${color}88` : "none",
                zIndex: isHovered ? 10 : 1,
              }}
            >
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logoUrl}
                  alt={p.name}
                  style={{
                    maxWidth: "85%",
                    maxHeight: "85%",
                    objectFit: "contain",
                  }}
                  crossOrigin="anonymous"
                />
              ) : showName ? (
                <span
                  style={{
                    color: "#0f172a",
                    fontSize: Math.min(14, (p.width * cellSize) / 5),
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "4px 6px",
                    lineHeight: 1.2,
                    userSelect: "none",
                  }}
                >
                  {p.name}
                </span>
              ) : null}
            </div>
          );

          if (p.websiteUrl) {
            return (
              <a key={p.id} href={p.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ display: "contents" }}>
                {block}
              </a>
            );
          }
          return block;
        })}
      </div>
    </div>
  );
}
