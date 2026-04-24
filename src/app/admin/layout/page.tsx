"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type Donor = {
  id: string;
  name: string;
  computer_count: number;
  is_active: number;
};

type Layout = {
  donor_id: string;
  row_start: number;
  col_start: number;
  width: number;
  height: number;
  manual_override: number;
};

type LayoutError = { donorId: string; name: string; reason: string };

type GridSettings = {
  grid_cols: number;
  grid_rows: number;
  brand_color: string;
  grid_color: string;
};

export default function LayoutPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [layouts, setLayouts] = useState<Map<string, Layout>>(new Map());
  const [errors, setErrors] = useState<LayoutError[]>([]);
  const [settings, setSettings] = useState<GridSettings | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ row: 0, col: 0, width: 1, height: 1, manualOverride: false });
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ donorId: string; row: number; col: number; valid: boolean } | null>(
    null
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    Promise.all([
      fetch("/api/admin/donors").then((r) => r.json()),
      fetch("/api/admin/layout").then((r) => r.json()),
      fetch("/api/admin/summary").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]).then(([d, l, s, cfg]) => {
      setDonors(d);
      setLayouts(new Map(l.map((x: Layout) => [x.donor_id, x])));
      setErrors(s.layoutErrors || []);
      setSettings(cfg);
    });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(
    () => {
      const update = () => {
        if (containerRef.current) {
          setContainerWidth((prev) => {
            const next = containerRef.current!.clientWidth;
            return prev === next ? prev : next;
          });
        }
      };
      const ro = containerRef.current ? new ResizeObserver(update) : null;
      if (containerRef.current && ro) ro.observe(containerRef.current);
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("resize", update);
        ro?.disconnect();
      };
    },
    [settings]
  );

  const recalc = async () => {
    setRecalcing(true);
    const res = await fetch("/api/admin/layout", { method: "POST" });
    const d = await res.json();
    setErrors(d.errors || []);
    setMsg(`${d.placedCount} bağışçı yerleştirildi.`);
    setTimeout(() => setMsg(""), 3000);
    setRecalcing(false);
    load();
  };

  const openEdit = (donor: Donor) => {
    const layout = layouts.get(donor.id);
    setEditId(donor.id);
    setEditForm({
      row: layout?.row_start ?? 0,
      col: layout?.col_start ?? 0,
      width: layout?.width ?? 1,
      height: layout?.height ?? 1,
      manualOverride: layout?.manual_override === 1,
    });
  };

  const saveLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/admin/layout/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditId(null);
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Hata oluştu");
    }
    setSaving(false);
  };

  const clearManual = async (donorId: string) => {
    await fetch(`/api/admin/layout/${donorId}`, { method: "DELETE" });
    load();
  };

  const activeDonors = useMemo(() => donors.filter((d) => d.is_active), [donors]);

  const cols = settings?.grid_cols ?? 13;
  const rows = settings?.grid_rows ?? 8;
  const brand = settings?.brand_color ?? "#06a7bc";
  const cellSize = containerWidth > 0 ? Math.max(32, Math.min(56, Math.floor((containerWidth - 4) / cols))) : 48;
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  const occupiedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, l] of layouts) {
      for (let dr = 0; dr < l.height; dr++) {
        for (let dc = 0; dc < l.width; dc++) {
          map.set(`${l.row_start + dr},${l.col_start + dc}`, id);
        }
      }
    }
    return map;
  }, [layouts]);

  const validateMove = (donorId: string, row: number, col: number): boolean => {
    const layout = layouts.get(donorId);
    if (!layout) return false;
    const { width: w, height: h } = layout;
    if (row < 0 || col < 0 || row + h > rows || col + w > cols) return false;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const occupier = occupiedBy.get(`${row + dr},${col + dc}`);
        if (occupier && occupier !== donorId) return false;
      }
    }
    return true;
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    setHoverTarget(null);
    const donorId = String(event.active.id);
    const over = event.over;
    if (!over) return;
    const [rStr, cStr] = String(over.id).replace("cell:", "").split(",");
    const row = Number(rStr);
    const col = Number(cStr);
    if (!validateMove(donorId, row, col)) return;

    const layout = layouts.get(donorId);
    if (!layout) return;
    const prev = new Map(layouts);
    const optimistic: Layout = { ...layout, row_start: row, col_start: col, manual_override: 1 };
    const next = new Map(prev);
    next.set(donorId, optimistic);
    setLayouts(next);

    const res = await fetch(`/api/admin/layout/${donorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, col, width: layout.width, height: layout.height, manualOverride: true }),
    });
    if (!res.ok) {
      setLayouts(prev);
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Kaydedilemedi");
    } else {
      load();
    }
  };

  const activeLayout = activeDrag ? layouts.get(activeDrag) : null;
  const activeDonor = activeDrag ? donors.find((d) => d.id === activeDrag) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Yerleşim Yönetimi</h1>
        <button
          onClick={recalc}
          disabled={recalcing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {recalcing ? "Hesaplanıyor..." : "🔄 Otomatik Yerleştir"}
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{msg}</div>}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h3 className="font-semibold text-red-700 mb-2">⚠️ Yerleşim Hataları</h3>
          <ul className="space-y-1">
            {errors.map((e) => (
              <li key={e.donorId} className="text-sm text-red-600">
                <strong>{e.name}:</strong> {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">Grid editörü</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Blokları sürükleyerek yeni konuma bırakın. Boyut değiştirmek için satırdan &ldquo;Düzenle&rdquo;yi kullanın.
            </p>
          </div>
        </div>

        <div ref={containerRef} className="w-full overflow-x-auto">
          <DndContext
            sensors={sensors}
            onDragStart={(e) => setActiveDrag(String(e.active.id))}
            onDragMove={(e) => {
              const donorId = String(e.active.id);
              const over = e.over;
              if (!over) {
                setHoverTarget(null);
                return;
              }
              const [rStr, cStr] = String(over.id).replace("cell:", "").split(",");
              const row = Number(rStr);
              const col = Number(cStr);
              setHoverTarget({ donorId, row, col, valid: validateMove(donorId, row, col) });
            }}
            onDragCancel={() => {
              setActiveDrag(null);
              setHoverTarget(null);
            }}
            onDragEnd={handleDragEnd}
          >
            <div
              style={{
                position: "relative",
                width: gridW,
                height: gridH,
                background: brand,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: rows }).flatMap((_, r) =>
                Array.from({ length: cols }).map((_, c) => (
                  <DroppableCell
                    key={`${r}-${c}`}
                    row={r}
                    col={c}
                    cellSize={cellSize}
                    highlight={
                      hoverTarget &&
                      activeLayout &&
                      r >= hoverTarget.row &&
                      r < hoverTarget.row + activeLayout.height &&
                      c >= hoverTarget.col &&
                      c < hoverTarget.col + activeLayout.width
                        ? hoverTarget.valid
                          ? "valid"
                          : "invalid"
                        : null
                    }
                  />
                ))
              )}
              {Array.from(layouts.values()).map((l) => {
                const donor = donors.find((d) => d.id === l.donor_id);
                if (!donor || !donor.is_active) return null;
                const isDragged = activeDrag === l.donor_id;
                return (
                  <DraggableBlock
                    key={l.donor_id}
                    donor={donor}
                    layout={l}
                    cellSize={cellSize}
                    isDragged={isDragged}
                    hasError={errors.some((e) => e.donorId === l.donor_id)}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeDonor && activeLayout ? (
                <div
                  style={{
                    width: activeLayout.width * cellSize - 4,
                    height: activeLayout.height * cellSize - 4,
                    background: "white",
                    border: "2px solid rgba(0,0,0,0.2)",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#334155",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  {activeDonor.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {hoverTarget && !hoverTarget.valid && (
          <p className="mt-2 text-xs text-red-600">Bu konum geçersiz (çakışma ya da grid dışında).</p>
        )}
      </div>

      {editId && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">
            Manuel Yerleşim: {donors.find((d) => d.id === editId)?.name}
          </h2>
          <form onSubmit={saveLayout} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["row", "col", "width", "height"] as const).map((key) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 capitalize">
                  {key === "row" ? "Satır" : key === "col" ? "Sütun" : key === "width" ? "Genişlik" : "Yükseklik"}
                </label>
                <input
                  type="number"
                  min={key === "width" || key === "height" ? 1 : 0}
                  value={editForm[key]}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="flex items-end col-span-2 md:col-span-4 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={editForm.manualOverride}
                  onChange={(e) => setEditForm((p) => ({ ...p, manualOverride: e.target.checked }))}
                />
                Manuel yerleşimi etkinleştir
              </label>
            </div>
            <div className="flex gap-2 col-span-2 md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bağışçı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bilgisayar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Pozisyon</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tip</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeDonors.map((d) => {
              const layout = layouts.get(d.id);
              const hasError = errors.some((e) => e.donorId === d.id);
              return (
                <tr key={d.id} className={hasError ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.computer_count}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {layout ? (
                      `S${layout.row_start + 1} × S${layout.col_start + 1} (${layout.width}×${layout.height})`
                    ) : (
                      <span className="text-gray-400">Yerleştirilmedi</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {layout?.manual_override ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Manuel
                      </span>
                    ) : layout ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Otomatik
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                        Boşta
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">
                        Düzenle
                      </button>
                      {layout?.manual_override === 1 && (
                        <button onClick={() => clearManual(d.id)} className="text-xs text-gray-500 hover:underline">
                          Sıfırla
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DroppableCell({
  row,
  col,
  cellSize,
  highlight,
}: {
  row: number;
  col: number;
  cellSize: number;
  highlight: "valid" | "invalid" | null;
}) {
  const { setNodeRef } = useDroppable({ id: `cell:${row},${col}` });
  const background =
    highlight === "valid"
      ? "rgba(34,197,94,0.35)"
      : highlight === "invalid"
        ? "rgba(239,68,68,0.35)"
        : "rgba(255,255,255,0.08)";
  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: col * cellSize,
        top: row * cellSize,
        width: cellSize - 1,
        height: cellSize - 1,
        background,
        border: "1px solid rgba(255,255,255,0.15)",
        boxSizing: "border-box",
      }}
    />
  );
}

function DraggableBlock({
  donor,
  layout,
  cellSize,
  isDragged,
  hasError,
}: {
  donor: Donor;
  layout: Layout;
  cellSize: number;
  isDragged: boolean;
  hasError: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: donor.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        position: "absolute",
        left: layout.col_start * cellSize + 2,
        top: layout.row_start * cellSize + 2,
        width: layout.width * cellSize - 4,
        height: layout.height * cellSize - 4,
        background: "white",
        border: hasError ? "2px solid #dc2626" : "1px solid rgba(0,0,0,0.1)",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragged || isDragging ? 0.25 : 1,
        fontSize: Math.min(12, layout.width * cellSize / 6),
        fontWeight: 700,
        color: "#334155",
        padding: 4,
        textAlign: "center",
        userSelect: "none",
        touchAction: "none",
      }}
      title={`${donor.name} (${donor.computer_count} bilgisayar)`}
    >
      {donor.name}
    </div>
  );
}
