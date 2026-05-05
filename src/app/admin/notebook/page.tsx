"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "pending" | "in_progress" | "done";

type Entry = {
  id: string;
  name: string;
  phone: string | null;
  scheduled_at: number | null;
  discussion_note: string | null;
  next_followup_at: number | null;
  status: Status;
  created_at: number;
  updated_at: number;
};

type Summary = {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  dueSoon: number;
};

const STATUS_META: Record<Status, { label: string; pill: string; dot: string }> = {
  pending: {
    label: "Başlanmadı",
    pill: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  in_progress: {
    label: "Süreçte",
    pill: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  done: {
    label: "Bitti",
    pill: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const STATUS_ORDER: Status[] = ["pending", "in_progress", "done"];

const fmtDateTime = (ms: number | null) =>
  ms
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ms))
    : "—";

function toLocalInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

const EMPTY_DRAFT = {
  name: "",
  phone: "",
  scheduled_at: "",
  discussion_note: "",
  next_followup_at: "",
  status: "pending" as Status,
};

type Draft = typeof EMPTY_DRAFT;

export default function NotebookPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all" | "due">("all");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/notebook")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setEntries(data.entries);
        setSummary(data.summary);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
    setError("");
  };

  const startEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setDraft({
      name: entry.name,
      phone: entry.phone ?? "",
      scheduled_at: toLocalInput(entry.scheduled_at),
      discussion_note: entry.discussion_note ?? "",
      next_followup_at: toLocalInput(entry.next_followup_at),
      status: entry.status,
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const payload = {
      name: draft.name,
      phone: draft.phone || null,
      scheduled_at: fromLocalInput(draft.scheduled_at),
      discussion_note: draft.discussion_note || null,
      next_followup_at: fromLocalInput(draft.next_followup_at),
      status: draft.status,
    };
    const url = editingId === "new" ? "/api/admin/notebook" : `/api/admin/notebook/${editingId}`;
    const method = editingId === "new" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Kaydedilemedi.");
      return;
    }
    cancelEdit();
    load();
  };

  const updateStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/admin/notebook/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  };

  const remove = async (id: string) => {
    if (!confirm("Kayıt silinsin mi?")) return;
    const res = await fetch(`/api/admin/notebook/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  // Snapshot "now" once on mount — used only for visual overdue highlighting.
  const [now] = useState<number>(() => Date.now());

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "due") {
      return entries.filter(
        (e) => e.status !== "done" && e.next_followup_at != null && e.next_followup_at <= now
      );
    }
    return entries.filter((e) => e.status === filter);
  }, [entries, filter, now]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Not Defteri</h1>
          <p className="text-sm text-gray-500">
            Görüşülecek kişi ve kurumların listesi. Görüşme tarihini, konuşulanı ve hatırlatma randevusunu burada
            tutabilirsin. Süreç bittiğinde &ldquo;Bitti&rdquo; olarak kapatabilirsin.
          </p>
        </div>
        <button
          onClick={startNew}
          className="self-start md:self-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Yeni kayıt
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor…</div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card label="Toplam" value={summary.total} />
          <Card label="Başlanmadı" value={summary.pending} accent="text-gray-700" />
          <Card label="Süreçte" value={summary.inProgress} accent="text-amber-600" />
          <Card label="Bitti" value={summary.done} accent="text-emerald-600" />
          <Card label="Bugün hatırlatma" value={summary.dueSoon} accent="text-red-600" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Hepsi
        </FilterChip>
        <FilterChip active={filter === "due"} onClick={() => setFilter("due")}>
          Hatırlatması geçen
        </FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_META[s].label}
          </FilterChip>
        ))}
      </div>

      {editingId && (
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="font-semibold text-gray-800">
            {editingId === "new" ? "Yeni kayıt" : "Kaydı düzenle"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ad / Şirket *">
              <input
                required
                maxLength={200}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Görüşülecek kişi veya kurum"
              />
            </Field>
            <Field label="Telefon">
              <input
                type="tel"
                maxLength={60}
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm tabular-nums"
                placeholder="0 5__ ___ __ __"
              />
            </Field>
            <Field label="Görüşme tarihi">
              <input
                type="datetime-local"
                value={draft.scheduled_at}
                onChange={(e) => setDraft((d) => ({ ...d, scheduled_at: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Hatırlatma randevusu">
              <input
                type="datetime-local"
                value={draft.next_followup_at}
                onChange={(e) => setDraft((d) => ({ ...d, next_followup_at: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Durum">
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Status }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Görüşme notu / konuşulanlar">
                <textarea
                  rows={4}
                  value={draft.discussion_note}
                  onChange={(e) => setDraft((d) => ({ ...d, discussion_note: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                  placeholder="Konuşulanlar, sözler, sonraki adımlar…"
                  maxLength={4000}
                />
              </Field>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kişi / Kurum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Görüşme</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Hatırlatma</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Not</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Bu filtre için kayıt yok.
                </td>
              </tr>
            )}
            {filtered.map((entry) => {
              const overdue =
                entry.status !== "done" &&
                entry.next_followup_at != null &&
                entry.next_followup_at <= now;
              const statusMeta = STATUS_META[entry.status];
              return (
                <tr key={entry.id} className={overdue ? "bg-red-50/50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{entry.name}</div>
                    {entry.phone && (
                      <a
                        href={`tel:${entry.phone.replace(/[^0-9+]/g, "")}`}
                        className="text-xs text-blue-600 hover:underline tabular-nums"
                      >
                        {entry.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDateTime(entry.scheduled_at)}</td>
                  <td className="px-4 py-3 text-xs">
                    {entry.next_followup_at ? (
                      <span className={overdue ? "text-red-600 font-semibold" : "text-gray-600"}>
                        {fmtDateTime(entry.next_followup_at)}
                        {overdue && <span className="ml-1">⏰</span>}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry.status}
                      onChange={(e) => updateStatus(entry.id, e.target.value as Status)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusMeta.pill} cursor-pointer`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                    {entry.discussion_note ? (
                      <div className="whitespace-pre-wrap line-clamp-3">{entry.discussion_note}</div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Düzenle
                      </button>
                      {entry.status !== "done" && (
                        <button
                          onClick={() => updateStatus(entry.id, "done")}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Kapat
                        </button>
                      )}
                      <button
                        onClick={() => remove(entry.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Sil
                      </button>
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

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-2xl font-black tabular-nums ${accent ?? "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full font-medium border transition-colors ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
