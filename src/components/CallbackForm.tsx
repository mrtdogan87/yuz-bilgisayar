"use client";

import { useState } from "react";

type Props = {
  brand: string;
  brandDark: string;
};

export default function CallbackForm({ brand, brandDark }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gönderilemedi.");
      } else {
        setSuccess(true);
        setForm({ name: "", phone: "", note: "" });
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="inline-block w-1 h-5 rounded" style={{ background: brand }} />
          <span className="font-bold text-slate-700">Bizi arayın</span>
          <span className="text-xs text-slate-500 hidden sm:block">
            Adınızı ve numaranızı bırakın, en kısa sürede biz arayalım.
          </span>
          <span className="ml-auto text-slate-400" aria-hidden>
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div className="p-6 border-t border-slate-100">
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                Talebiniz alındı. En kısa sürede sizi arayacağız.
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="ml-3 text-xs text-emerald-700 underline"
                >
                  Yeni kayıt
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-slate-600">Ad / Şirket</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ outlineColor: brand }}
                    placeholder="Adınız ya da kurumunuz"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-slate-600">Telefon</label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm tabular-nums"
                    placeholder="0 5__ ___ __ __"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-slate-600">Kısa not (opsiyonel)</label>
                  <input
                    type="text"
                    maxLength={500}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Örn. 5 bilgisayar bağışlamak istiyorum"
                  />
                </div>
                {error && <div className="md:col-span-3 text-sm text-red-600">{error}</div>}
                <div className="md:col-span-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Numaranız sadece bu kampanya için sizi aramamıza yarar; üçüncü taraflarla paylaşılmaz.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                    style={{ background: brandDark }}
                  >
                    {submitting ? "Gönderiliyor…" : "Aranma talebi bırak"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
