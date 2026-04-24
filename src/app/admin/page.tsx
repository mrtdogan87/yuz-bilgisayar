"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  totalComputers: number;
  activeDonorCount: number;
  totalDonorCount: number;
  gridCapacity: number;
  freeCells: number;
  layoutErrors: { donorId: string; name: string; reason: string }[];
  lastUpdated: string;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/admin/summary").then((r) => r.json()).then(setSummary);
  }, []);

  if (!summary) return <div className="text-gray-400">Yükleniyor...</div>;

  const stats = [
    { label: "Toplam Bilgisayar", value: summary.totalComputers, color: "blue" },
    { label: "Aktif Bağışçı", value: summary.activeDonorCount, color: "green" },
    { label: "Grid Kapasitesi", value: summary.gridCapacity, color: "purple" },
    { label: "Boş Hücre", value: summary.freeCells, color: summary.freeCells === 0 ? "red" : "gray" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Özet</h1>
        <p className="text-sm text-gray-500 mt-1">
          Son güncelleme: {new Date(summary.lastUpdated).toLocaleString("tr-TR")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl font-black text-gray-800">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {summary.layoutErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h2 className="font-semibold text-red-700 mb-3">⚠️ Yerleşim Hataları</h2>
          <ul className="space-y-1">
            {summary.layoutErrors.map((e) => (
              <li key={e.donorId} className="text-sm text-red-600">
                <strong>{e.name}:</strong> {e.reason}
              </li>
            ))}
          </ul>
          <Link href="/admin/layout" className="mt-3 inline-block text-sm text-red-700 underline">
            Yerleşim yönetimine git →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/admin/donors", icon: "👥", title: "Bağışçı Ekle", desc: "Yeni bağışçı ekle veya mevcut bağışçıları düzenle" },
          { href: "/admin/settings", icon: "⚙️", title: "Kampanya Ayarları", desc: "Başlık, renkler ve paylaşım metinlerini düzenle" },
          { href: "/admin/layout", icon: "🗂️", title: "Yerleşim", desc: "Otomatik veya manuel grid yerleşimini yönet" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{card.title}</div>
            <div className="text-sm text-gray-500 mt-1">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
