"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  created_at: number;
  called_at: number | null;
  call_note: string | null;
};

type Summary = { total: number; pending: number; called: number };

const fmtDate = (ms: number) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ms));

function elapsedLabel(fromMs: number, toMs: number | null): string {
  const target = toMs ?? Date.now();
  const diff = target - fromMs;
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} sa`;
  const days = Math.round(hours / 24);
  return `${days} gün`;
}

export default function CallbacksPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const load = () => {
    fetch("/api/admin/callbacks")
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

  const markCalled = (id: string, called: boolean) => {
    fetch(`/api/admin/callbacks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markCalled: called }),
    }).then(load);
  };

  const saveNote = (id: string) => {
    fetch(`/api/admin/callbacks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_note: editNote }),
    }).then(() => {
      setEditingId(null);
      setEditNote("");
      load();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Kayıt silinsin mi?")) return;
    fetch(`/api/admin/callbacks/${id}`, { method: "DELETE" }).then(load);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Geri Arama Talepleri</h1>
        <p className="text-sm text-gray-500">
          Sayfadaki &ldquo;Bizi arayın&rdquo; formundan gelen kayıtlar. Aradığınızda &ldquo;Arandı&rdquo; olarak
          işaretleyin; geçen süre otomatik hesaplanır.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor…</div>
      ) : summary ? (
        <div className="grid grid-cols-3 gap-3">
          <Card label="Toplam" value={summary.total} />
          <Card label="Bekleyen" value={summary.pending} accent="text-amber-600" />
          <Card label="Arandı" value={summary.called} accent="text-emerald-600" />
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Geldi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ad / Şirket</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Telefon</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Talep Notu</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  Henüz geri arama talebi yok.
                </td>
              </tr>
            )}
            {entries.map((e) => {
              const isEditing = editingId === e.id;
              const cleanNote = (e.note ?? "").replace(/\n?\[ip:[^\]]+\]/g, "").trim();
              return (
                <tr key={e.id} className={e.called_at ? "" : "bg-amber-50/30"}>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${e.phone.replace(/[^0-9+]/g, "")}`}
                      className="text-blue-600 hover:underline tabular-nums"
                    >
                      {e.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cleanNote ? cleanNote : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.called_at ? (
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          Arandı · {fmtDate(e.called_at)}
                        </span>
                        <div className="text-gray-500 mt-1">
                          {elapsedLabel(e.created_at, e.called_at)} içinde dönüş yapıldı
                        </div>
                        {isEditing ? (
                          <div className="mt-1 flex gap-1 items-center">
                            <input
                              value={editNote}
                              onChange={(ev) => setEditNote(ev.target.value)}
                              className="border rounded px-2 py-1 text-xs flex-1"
                              placeholder="Görüşme notu"
                            />
                            <button
                              onClick={() => saveNote(e.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditNote("");
                              }}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              İptal
                            </button>
                          </div>
                        ) : e.call_note ? (
                          <div className="mt-1 italic text-gray-600">&ldquo;{e.call_note}&rdquo;</div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Bekliyor · {elapsedLabel(e.created_at, null)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {e.called_at ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(e.id);
                              setEditNote(e.call_note ?? "");
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Not düzenle
                          </button>
                          <button
                            onClick={() => markCalled(e.id, false)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Geri al
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => markCalled(e.id, true)}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Arandı işaretle
                        </button>
                      )}
                      <button onClick={() => remove(e.id)} className="text-xs text-red-600 hover:underline">
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
      <div className={`mt-1 text-2xl font-black tabular-nums ${accent ?? "text-gray-900"}`}>{value}</div>
    </div>
  );
}
