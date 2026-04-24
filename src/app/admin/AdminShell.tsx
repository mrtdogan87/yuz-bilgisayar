"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "📊 Özet", exact: true },
  { href: "/admin/donors", label: "👥 Bağışçılar" },
  { href: "/admin/reach", label: "📈 Gösterimler" },
  { href: "/admin/settings", label: "⚙️ Ayarlar" },
  { href: "/admin/layout", label: "🗂️ Yerleşim" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    fetch("/api/admin/summary")
      .then((r) => {
        if (r.ok) setAuthed(true);
        else if (r.status === 401) {
          setAuthed(false);
          fetch("/api/admin/auth").then((r) => r.json()).then((d) => setHasPassword(d.hasPassword));
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    if (res.ok) {
      setAuthed(true);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Hata");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAuthed(false);
    setPassword("");
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={login} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-800">Yönetim Paneli</h1>
          {!hasPassword && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
              İlk kurulum: bir şifre belirleyin.
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-gray-600">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={hasPassword ? "Şifrenizi girin" : "En az 6 karakter"}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            {hasPassword ? "Giriş Yap" : "Şifre Belirle ve Giriş Yap"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-3 shrink-0">
        <div className="px-3 mb-6">
          <span className="font-black text-sm text-gray-800 leading-tight">
            100 Bilgisayar<br />
            <span className="text-blue-600">Yönetim</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            🌐 Siteyi Görüntüle
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
