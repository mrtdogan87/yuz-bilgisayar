"use client";

import { useEffect, useState } from "react";

type Settings = {
  campaign_title: string;
  campaign_subtitle: string;
  grid_cols: number;
  grid_rows: number;
  reach_target: number;
  brand_color: string;
  border_color: string;
  grid_color: string;
  font_family: string;
  reach_text: string;
  share_text: string;
  instagram_text: string;
  poster_title: string;
  poster_file_url: string | null;
  poster_file_name: string | null;
  poster_mime_type: string | null;
  header_left_text: string;
  header_right_text: string;
  footer_text: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posterError, setPosterError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setSettings(d); setForm(d); });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignTitle: form.campaign_title,
        campaignSubtitle: form.campaign_subtitle,
        gridCols: Number(form.grid_cols),
        gridRows: Number(form.grid_rows),
        reachTarget: Number(form.reach_target),
        brandColor: form.brand_color,
        borderColor: form.border_color,
        gridColor: form.grid_color,
        fontFamily: form.font_family,
        reachText: form.reach_text,
        shareText: form.share_text,
        instagramText: form.instagram_text,
        posterTitle: form.poster_title,
        headerLeftText: form.header_left_text,
        headerRightText: form.header_right_text,
        footerText: form.footer_text,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(data.error || "Hata oluştu");
    }
    setSaving(false);
  };

  const uploadPoster = async (file: File) => {
    setUploading(true);
    setPosterError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/poster", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setSettings((s) => s ? { ...s, poster_file_url: data.url, poster_file_name: file.name } : s);
    } else {
      const d = await res.json();
      setPosterError(d.error || "Yüklenemedi");
    }
    setUploading(false);
  };

  const removePoster = async () => {
    if (!confirm("Afişi kaldırmak istediğinizden emin misiniz?")) return;
    await fetch("/api/admin/poster", { method: "DELETE" });
    setSettings((s) => s ? { ...s, poster_file_url: null, poster_file_name: null, poster_mime_type: null } : s);
  };

  if (!settings || !form) return <div className="text-gray-400">Yükleniyor...</div>;

  const f = (key: keyof Settings) => ({
    value: (form[key] ?? "") as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Kampanya Ayarları</h1>

      <form onSubmit={save} className="space-y-6">
        {/* Texts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">Metinler</h2>
          <Field label="Kampanya Başlığı" required>
            <input {...f("campaign_title")} required className="input" />
          </Field>
          <Field label="Alt Başlık">
            <input {...f("campaign_subtitle")} className="input" />
          </Field>
          <Field label="İletişim / Erişim Metni">
            <textarea {...f("reach_text")} rows={2} className="input resize-none" />
          </Field>
        </div>

        {/* Header & footer */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-700">Üst Şerit & Alt Bilgi</h2>
            <p className="text-xs text-gray-500 mt-1">
              Sayfanın en üstündeki ince renkli şerit ve en alttaki footer metni. Boş bırakılırsa ilgili alan
              gösterilmez.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Üst Şerit – Sol Metin">
              <input {...f("header_left_text")} className="input" placeholder="Örn. Manisa Celal Bayar Üniversitesi İİBF" />
            </Field>
            <Field label="Üst Şerit – Sağ Metin">
              <input {...f("header_right_text")} className="input" placeholder="Örn. Bağış Duvarı" />
            </Field>
          </div>
          <Field label="Alt Bilgi (Footer)">
            <textarea {...f("footer_text")} rows={2} className="input resize-none" placeholder="Sayfa altında gösterilecek kurum/iletişim metni" />
          </Field>
        </div>

        {/* Share texts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">Paylaşım Metinleri</h2>
          <Field label="Genel Paylaşım Metni">
            <textarea {...f("share_text")} rows={3} className="input resize-none" />
          </Field>
          <Field label="Instagram Metni">
            <textarea {...f("instagram_text")} rows={3} className="input resize-none" />
          </Field>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Grid Boyutu</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sütun Sayısı">
              <input {...f("grid_cols")} type="number" min={1} max={30} className="input" />
            </Field>
            <Field label="Satır Sayısı">
              <input {...f("grid_rows")} type="number" min={1} max={30} className="input" />
            </Field>
          </div>
          <p className="text-xs text-amber-600 mt-2">⚠️ Grid küçültmek mevcut yerleşimleri bozabilir.</p>
        </div>

        {/* Colors */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Renkler</h2>
          <div className="grid grid-cols-3 gap-4">
            {([
              ["brand_color", "Ana Renk"],
              ["border_color", "Dış Çizgi"],
              ["grid_color", "Hücre Çizgisi"],
            ] as [keyof Settings, string][]).map(([key, label]) => (
              <Field key={key} label={label}>
                <div className="flex gap-2 items-center">
                  <input type="color" value={(form[key] as string) || "#000000"} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="w-10 h-9 rounded border cursor-pointer" />
                  <input {...f(key)} className="input flex-1 font-mono text-xs" />
                </div>
              </Field>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Kaydediliyor..." : saved ? "✓ Kaydedildi" : "Kaydet"}
        </button>
      </form>

      {/* Poster */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Kampanya Afişi</h2>
        {settings.poster_file_url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl">{settings.poster_mime_type === "application/pdf" ? "📄" : "🖼️"}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{settings.poster_file_name}</p>
                <a href={settings.poster_file_url} target="_blank" className="text-xs text-blue-600 hover:underline">Görüntüle</a>
              </div>
              <button onClick={removePoster} className="text-xs text-red-500 hover:underline">Kaldır</button>
            </div>
            <label className="cursor-pointer text-sm text-blue-600 hover:underline">
              Değiştir
              <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPoster(e.target.files[0]); }} />
            </label>
          </div>
        ) : (
          <div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="text-3xl mb-2">📎</div>
              <span className="text-sm text-gray-500">{uploading ? "Yükleniyor..." : "PDF, PNG veya JPG yükle (maks. 20MB)"}</span>
              <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPoster(e.target.files[0]); }} disabled={uploading} />
            </label>
            {posterError && <p className="text-sm text-red-600 mt-2">{posterError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
