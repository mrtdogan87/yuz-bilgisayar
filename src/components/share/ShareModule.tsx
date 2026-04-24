"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

type Props = {
  shareText: string;
  instagramText: string;
  pageUrl: string;
  brand?: string;
  seed?: string | null;
};

type FormatKey = "square" | "story" | "linkedin";

type Format = {
  key: FormatKey;
  label: string;
  dimensions: string;
  aspect: string;
  endpoint: string;
  filename: string;
  hint: string;
};

const FORMATS: Format[] = [
  {
    key: "square",
    label: "Kare",
    dimensions: "1080 × 1080",
    aspect: "aspect-square",
    endpoint: "/api/og/square",
    filename: "bagis-duvari-kare.png",
    hint: "Instagram / LinkedIn feed / X",
  },
  {
    key: "story",
    label: "Story",
    dimensions: "1080 × 1920",
    aspect: "aspect-[9/16]",
    endpoint: "/api/og/story",
    filename: "bagis-duvari-story.png",
    hint: "Instagram / WhatsApp hikâye",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    dimensions: "1200 × 630",
    aspect: "aspect-[1200/630]",
    endpoint: "/api/og",
    filename: "bagis-duvari-linkedin.png",
    hint: "LinkedIn paylaşımı / link ön izleme",
  },
];

const emptySubscribe = () => () => {};

export default function ShareModule({ shareText, instagramText, pageUrl, brand = "#06a7bc", seed }: Props) {
  const [copied, setCopied] = useState<"share" | "instagram" | "url" | null>(null);
  const [sharing, setSharing] = useState(false);
  const [activeFormat, setActiveFormat] = useState<FormatKey | null>(null);
  const [manualNonce, setManualNonce] = useState(0);

  const canNativeShare = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false
  );

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (seed) params.set("seed", seed);
    if (manualNonce) params.set("ts", String(manualNonce));
    return params.toString();
  }, [seed, manualNonce]);

  const current = activeFormat ? FORMATS.find((f) => f.key === activeFormat) ?? null : null;

  const copy = async (text: string, type: "share" | "instagram" | "url") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const download = () => {
    if (!current) return;
    const link = document.createElement("a");
    link.download = current.filename;
    link.href = `${current.endpoint}?${qs}`;
    link.click();
  };

  const openInNewTab = () => {
    if (!current) return;
    window.open(`${current.endpoint}?${qs}`, "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    if (!navigator.share || sharing) return;
    setSharing(true);
    try {
      await navigator.share({
        title: "100 Bilgisayar = 100 Gelecek",
        text: shareText,
        url: pageUrl,
      });
    } catch (err) {
      const name = (err as Error)?.name;
      if (name === "AbortError" || name === "InvalidStateError") return;
      throw err;
    } finally {
      setSharing(false);
    }
  };

  const openInstagram = async () => {
    await navigator.clipboard.writeText(instagramText || shareText);
    setCopied("instagram");
    setTimeout(() => setCopied(null), 2000);
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const socialLinks = [
    {
      name: "WhatsApp",
      color: "#25D366",
      icon: "💬",
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`,
    },
    {
      name: "X",
      color: "#000000",
      icon: "✖",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "LinkedIn",
      color: "#0077B5",
      icon: "in",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Preview & format tabs */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FORMATS.map((f) => {
              const isActive = activeFormat === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFormat(isActive ? null : f.key)}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isActive
                      ? "text-white border-transparent"
                      : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  style={isActive ? { background: brand } : undefined}
                >
                  {f.label}
                  <span className="ml-1 opacity-70 font-normal">· {f.dimensions}</span>
                </button>
              );
            })}
          </div>
          {current ? (
            <>
              <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className={`w-full ${current.aspect} flex items-center justify-center`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`${current.key}-${qs}`}
                    src={`${current.endpoint}?${qs}`}
                    alt={`${current.label} önizleme`}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">{current.hint}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={download}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: brand }}
                >
                  ⬇ {current.label} indir
                </button>
                <button
                  onClick={openInNewTab}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ↗ Yeni sekmede aç
                </button>
                <button
                  onClick={() => setManualNonce(Date.now())}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Yeni yerleşimle önizlemeyi yenile"
                >
                  ↻ Yenile
                </button>
                <button
                  onClick={() => setActiveFormat(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Önizleme için bir format seçin.
            </div>
          )}
        </div>

        {/* Quick share column */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sayfa linki</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={pageUrl}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
              />
              <button
                onClick={() => copy(pageUrl, "url")}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
              >
                {copied === "url" ? "✓" : "Kopyala"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canNativeShare && (
              <button
                onClick={nativeShare}
                disabled={sharing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                ↗ Cihazla paylaş
              </button>
            )}
            {socialLinks.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ background: s.color }}
              >
                <span>{s.icon}</span> {s.name}
              </a>
            ))}
            <button
              onClick={openInstagram}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)" }}
            >
              <span>📷</span> {copied === "instagram" ? "Metin kopyalandı!" : "Instagram"}
            </button>
          </div>
        </div>
      </div>

      {/* Share texts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shareText && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Genel paylaşım metni</p>
            <div className="flex gap-2">
              <textarea
                readOnly
                value={shareText}
                rows={3}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 resize-none"
              />
              <button
                onClick={() => copy(shareText, "share")}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
              >
                {copied === "share" ? "✓" : "Kopyala"}
              </button>
            </div>
          </div>
        )}
        {instagramText && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Instagram metni</p>
            <div className="flex gap-2">
              <textarea
                readOnly
                value={instagramText}
                rows={3}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 resize-none"
              />
              <button
                onClick={() => copy(instagramText, "instagram")}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
              >
                {copied === "instagram" ? "✓" : "Kopyala"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
