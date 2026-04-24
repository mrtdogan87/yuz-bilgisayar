"use client";

import { useEffect, useMemo, useState } from "react";

type ReachEntry = {
  id: string;
  platform: string;
  count: number;
  note: string | null;
  entry_date: string;
  created_at: number;
  updated_at: number;
};

type ReachSummary = {
  target: number;
  webCount: number;
  socialCount: number;
  totalCount: number;
  remaining: number;
  percent: number;
  sources: Record<string, number>;
};

const PLATFORMS: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Diğer" },
];

const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.label]));

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReachAdminPage() {
  const [summary, setSummary] = useState<ReachSummary | null>(null);
  const [entries, setEntries] = useState<ReachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ platform: "instagram", entry_date: todayIso(), count: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ReachEntry | null>(null);

  const load = () => {
    fetch("/api/admin/reach")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setSummary(data.summary);
        setEntries(data.entries);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const count = Number(form.count);
    if (!Number.isInteger(count) || count < 0) {
      setError("Geçerli bir sayı girin.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: form.platform,
        entry_date: form.entry_date,
        count,
        note: form.note.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Kayıt başarısız.");
      return;
    }
    setForm({ platform: form.platform, entry_date: form.entry_date, count: "", note: "" });
    load();
  };

  const startEdit = (entry: ReachEntry) => {
    setEditingId(entry.id);
    setEditDraft({ ...entry });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };
  const saveEdit = async () => {
    if (!editDraft) return;
    const res = await fetch(`/api/admin/reach/${editDraft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: editDraft.platform,
        count: editDraft.count,
        note: editDraft.note ?? "",
        entry_date: editDraft.entry_date,
      }),
    });
    if (res.ok) {
      cancelEdit();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Güncelleme başarısız.");
    }
  };
  const deleteEntry = async (id: string) => {
    if (!confirm("Kayıt silinsin mi?")) return;
    const res = await fetch(`/api/admin/reach/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const byPlatform = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of PLATFORMS) m[p.value] = 0;
    if (summary) {
      for (const p of PLATFORMS) m[p.value] = summary.sources[p.value] ?? 0;
    }
    return m;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gösterim Takibi</h1>
          <p className="text-sm text-gray-500">
            Saatlik tekil web ziyaretleri otomatik sayılır. Sosyal medya ulaşımını buradan elle ekleyin.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor…</div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Toplam" value={summary.totalCount} accent="text-blue-700 bg-blue-50" />
          <SummaryCard label="Web (otomatik)" value={summary.webCount} accent="text-emerald-700 bg-emerald-50" />
          <SummaryCard label="Sosyal (elle)" value={summary.socialCount} accent="text-purple-700 bg-purple-50" />
          <SummaryCard label="Hedefe kalan" value={summary.remaining} accent="text-amber-700 bg-amber-50" />
        </div>
      ) : null}

      {summary && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">İlerleme</p>
              <p className="mt-1 text-sm text-gray-600">
                {new Intl.NumberFormat("tr-TR").format(summary.totalCount)} /{" "}
                {new Intl.NumberFormat("tr-TR").format(summary.target)} gösterim (%{Math.min(summary.percent, 100)})
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${Math.min(summary.percent, 100)}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
            {PLATFORMS.map((p) => (
              <span
                key={p.value}
                className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full bg-gray-50"
              >
                <span>{p.label}</span>
                <span className="font-semibold text-gray-800 tabular-nums">
                  {new Intl.NumberFormat("tr-TR").format(byPlatform[p.value] ?? 0)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Yeni sosyal kayıt</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-600">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-600">Tarih</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-600">Gösterim</label>
            <input
              type="number"
              min={0}
              value={form.count}
              onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Açıklama (opsiyonel)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Örn. Öğrenci Konseyi paylaşımı"
              maxLength={500}
            />
          </div>
          {error && <div className="md:col-span-5 text-sm text-red-600">{error}</div>}
          <div className="md:col-span-5">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Platform</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Gösterim</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Açıklama</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  Henüz sosyal gösterim kaydı yok.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const editing = editingId === entry.id && editDraft;
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {editing ? (
                      <input
                        type="date"
                        value={editDraft!.entry_date}
                        onChange={(e) =>
                          setEditDraft((d) => (d ? { ...d, entry_date: e.target.value } : d))
                        }
                        className="border rounded px-2 py-1 text-xs"
                      />
                    ) : (
                      entry.entry_date
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <select
                        value={editDraft!.platform}
                        onChange={(e) =>
                          setEditDraft((d) => (d ? { ...d, platform: e.target.value } : d))
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      PLATFORM_LABEL[entry.platform] ?? entry.platform
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        value={editDraft!.count}
                        onChange={(e) =>
                          setEditDraft((d) =>
                            d ? { ...d, count: Number(e.target.value) } : d
                          )
                        }
                        className="border rounded px-2 py-1 text-xs w-24 text-right"
                      />
                    ) : (
                      new Intl.NumberFormat("tr-TR").format(entry.count)
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {editing ? (
                      <input
                        type="text"
                        value={editDraft!.note ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => (d ? { ...d, note: e.target.value } : d))
                        }
                        className="border rounded px-2 py-1 text-xs w-full"
                        maxLength={500}
                      />
                    ) : (
                      entry.note || <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing ? (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Kaydet
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline">
                          İptal
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Sil
                        </button>
                      </div>
                    )}
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

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${accent}`}>&bull;</span>
      </div>
      <div className="mt-1 text-2xl font-black text-gray-900 tabular-nums">
        {new Intl.NumberFormat("tr-TR").format(value)}
      </div>
    </div>
  );
}
