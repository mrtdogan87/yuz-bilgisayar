"use client";

import { useEffect, useState, useRef } from "react";

type Donor = {
  id: string;
  order: number;
  is_active: number;
  name: string;
  computer_count: number;
  logo_url: string | null;
  logo_file_path: string | null;
  logo_aspect: number | null;
  bg_color: string | null;
  website_url: string | null;
  note: string | null;
};

const EMPTY_FORM = { name: "", computerCount: 1, logoUrl: "", websiteUrl: "", note: "", isActive: true, bgColor: "" };

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/donors")
      .then((r) => r.json())
      .then((d) => { setDonors(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (d: Donor) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      computerCount: d.computer_count,
      logoUrl: d.logo_url || "",
      websiteUrl: d.website_url || "",
      note: d.note || "",
      isActive: d.is_active === 1,
      bgColor: d.bg_color || "",
    });
    setError("");
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = { ...form, computerCount: Number(form.computerCount) };
    const res = editId
      ? await fetch(`/api/admin/donors/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/admin/donors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      const d = await res.json();
      setError(d.error || "Hata oluştu");
    }
    setSaving(false);
  };

  const toggleActive = async (d: Donor) => {
    await fetch(`/api/admin/donors/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: d.is_active === 0 }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu bağışçıyı silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/admin/donors/${id}`, { method: "DELETE" });
    load();
  };

  const measureAspect = (file: File): Promise<number | null> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });

  const uploadLogo = async (id: string, file: File) => {
    setUploadingLogo(id);
    try {
      const aspect = await measureAspect(file);
      const fd = new FormData();
      fd.append("file", file);
      if (aspect) fd.append("aspect", String(aspect));
      const res = await fetch(`/api/admin/donors/${id}/logo`, { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        let message = `Logo yüklenemedi (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) message = parsed.error;
        } catch {
          if (text) message = `${message}: ${text.slice(0, 200)}`;
        }
        console.error("Logo upload failed", res.status, text);
        alert(message);
      }
    } catch (err) {
      console.error("Logo upload network error", err);
      alert(`Logo yüklenemedi: ${(err as Error).message}`);
    } finally {
      setUploadingLogo(null);
      load();
    }
  };

  const removeLogo = async (id: string) => {
    await fetch(`/api/admin/donors/${id}/logo`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Bağışçılar</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Bağışçı Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">{editId ? "Düzenle" : "Yeni Bağışçı"}</h2>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Ad *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Bilgisayar Adedi *</label>
              <input
                required
                type="number"
                min={1}
                value={form.computerCount}
                onChange={(e) => setForm({ ...form, computerCount: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Logo URL</label>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Web Sitesi</label>
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Not (iç)</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Logo arka plan rengi</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={form.bgColor || "#ffffff"}
                  onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                  className="h-9 w-14 border rounded cursor-pointer"
                />
                <input
                  value={form.bgColor}
                  onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                  placeholder="Boş = otomatik"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                {form.bgColor && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bgColor: "" })}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm text-gray-600">Yayında</label>
            </div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Logo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {donors.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{d.name}</div>
                  {d.website_url && <div className="text-xs text-gray-400 truncate max-w-xs">{d.website_url}</div>}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-700">{d.computer_count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {(d.logo_file_path || d.logo_url) ? (
                      <>
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ background: d.bg_color || "transparent" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={d.logo_file_path ? `/api/uploads/${encodeURIComponent(d.logo_file_path)}` : d.logo_url!}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        {d.logo_aspect && (
                          <span className="text-[10px] text-gray-400">
                            {d.logo_aspect >= 1.15 ? "yatay" : d.logo_aspect <= 0.85 ? "dikey" : "kare"}
                          </span>
                        )}
                        <button onClick={() => removeLogo(d.id)} className="text-xs text-red-500 hover:underline">Kaldır</button>
                      </>
                    ) : (
                      <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                        {uploadingLogo === d.id ? "Yükleniyor..." : "Yükle"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) uploadLogo(d.id, e.target.files[0]); }}
                        />
                      </label>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(d)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {d.is_active ? "Yayında" : "Pasif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                    <button onClick={() => remove(d.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                  </div>
                </td>
              </tr>
            ))}
            {donors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz bağışçı yok. Eklemek için &ldquo;Bağışçı Ekle&rdquo; butonuna tıklayın.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <input ref={logoInputRef} type="file" className="hidden" />
    </div>
  );
}
