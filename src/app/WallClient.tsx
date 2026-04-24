"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import DonationWall from "@/components/wall/DonationWall";
import ShareModule from "@/components/share/ShareModule";

type PlacedDonor = {
  id: string;
  name: string;
  computerCount: number;
  logoUrl: string | null;
  websiteUrl: string | null;
  bgColor: string | null;
  row: number;
  col: number;
  width: number;
  height: number;
};

type DonorEntry = {
  id: string;
  name: string;
  computerCount: number;
  logoUrl: string | null;
  websiteUrl: string | null;
  bgColor: string | null;
  createdAt: string;
};

type WallSettings = {
  campaignTitle: string;
  campaignSubtitle: string;
  gridCols: number;
  gridRows: number;
  brandColor: string;
  borderColor: string;
  gridColor: string;
  reachText: string;
  shareText: string;
  instagramText: string;
  posterFileUrl: string | null;
  posterFileName: string | null;
  posterMimeType: string | null;
  reachTarget: number;
  computerGoal: number;
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

type Props = {
  settings: WallSettings;
  placed: PlacedDonor[];
  totalComputers: number;
  donorList: DonorEntry[];
  reach: ReachSummary;
  pageUrl: string;
};

const SOURCE_LABELS: { key: string; label: string; icon: string }[] = [
  { key: "web", label: "Web", icon: "🌐" },
  { key: "instagram", label: "Instagram", icon: "📷" },
  { key: "linkedin", label: "LinkedIn", icon: "in" },
  { key: "x", label: "X", icon: "✖" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
  { key: "other", label: "Diğer", icon: "•" },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function WallClient({
  settings,
  placed: initialPlaced,
  totalComputers,
  donorList,
  reach: initialReach,
  pageUrl,
}: Props) {
  const wallRef = useRef<HTMLDivElement>(null);
  const [animatedComputers, setAnimatedComputers] = useState(0);
  const [placed, setPlaced] = useState<PlacedDonor[]>(initialPlaced);
  const [shuffling, setShuffling] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [reach, setReach] = useState<ReachSummary>(initialReach);
  const [animatedReach, setAnimatedReach] = useState(0);

  const brand = settings.brandColor;
  const brandDark = settings.borderColor;
  const computerGoal = settings.computerGoal;

  const computerPct = useMemo(
    () => Math.min(Math.round((totalComputers / Math.max(computerGoal, 1)) * 100), 100),
    [totalComputers, computerGoal]
  );
  const reachPct = useMemo(
    () => Math.min(Math.round((reach.totalCount / Math.max(reach.target, 1)) * 100), 100),
    [reach.totalCount, reach.target]
  );

  const shuffle = async () => {
    if (shuffling) return;
    setShuffling(true);
    const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const res = await fetch(`/api/public/wall?seed=${newSeed}`);
      const data = await res.json();
      if (data?.placed) {
        setPlaced(data.placed);
        setSeed(newSeed);
      }
      if (data?.reach) setReach(data.reach);
    } finally {
      setTimeout(() => setShuffling(false), 500);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/reach", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then(() => fetch("/api/public/wall"))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.reach) setReach(data.reach);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const end = totalComputers;
    let value = 0;
    const duration = 1200;
    const step = Math.max(1, Math.ceil(Math.max(end, 1) / (duration / 16)));
    const timer = setInterval(() => {
      if (end === 0) {
        setAnimatedComputers(0);
        clearInterval(timer);
        return;
      }
      value = Math.min(value + step, end);
      setAnimatedComputers(value);
      if (value >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [totalComputers]);

  useEffect(() => {
    const end = reach.totalCount;
    let value = 0;
    const duration = 1500;
    const step = Math.max(1, Math.ceil(Math.max(end, 1) / (duration / 16)));
    const timer = setInterval(() => {
      if (end === 0) {
        setAnimatedReach(0);
        clearInterval(timer);
        return;
      }
      value = Math.min(value + step, end);
      setAnimatedReach(value);
      if (value >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [reach.totalCount]);

  const [featured, ...others] = donorList;
  const isPdf = settings.posterMimeType === "application/pdf";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top brand strip */}
      <div style={{ background: brand }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-white/80" />
            <span>Manisa Celal Bayar Üniversitesi İİBF</span>
          </div>
          <div className="text-xs opacity-80 hidden sm:block">Bağış Duvarı</div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3" style={{ color: brandDark }}>
          {settings.campaignTitle}
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          {settings.campaignSubtitle}
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-6xl mx-auto px-4 mb-10 grid gap-4 md:grid-cols-2">
        <ProgressPanel
          label="Bağışlanan bilgisayar"
          current={animatedComputers}
          displayCurrent={totalComputers}
          goal={computerGoal}
          pct={computerPct}
          brand={brand}
          brandDark={brandDark}
          caption={
            totalComputers >= computerGoal
              ? "Hedefe ulaşıldı — teşekkürler!"
              : `${computerGoal - totalComputers} bilgisayar kaldı`
          }
        />
        <ProgressPanel
          label="Toplam gösterim"
          current={animatedReach}
          displayCurrent={reach.totalCount}
          goal={reach.target}
          pct={reachPct}
          brand={brand}
          brandDark={brandDark}
          caption={
            reach.totalCount >= reach.target
              ? "Hedef gösterime ulaşıldı!"
              : `${formatNumber(reach.remaining)} gösterim kaldı`
          }
        >
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SOURCE_LABELS.map((src) => (
              <span
                key={src.key}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                title={src.label}
              >
                <span aria-hidden className="font-semibold" style={{ color: brandDark }}>{src.icon}</span>
                <span>{src.label}</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {formatNumber(reach.sources[src.key] ?? 0)}
                </span>
              </span>
            ))}
          </div>
        </ProgressPanel>
      </div>

      {/* Wall */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500">Sıralamaya göre değil — sanatçı yerleştirmesi.</div>
          <button
            onClick={shuffle}
            disabled={shuffling}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-wait"
            style={{ background: brand }}
          >
            <span className={shuffling ? "inline-block animate-spin" : "inline-block"}>🎲</span>
            {shuffling ? "Yerleşim hazırlanıyor..." : "Farklı yerleşim göster"}
          </button>
        </div>
        <DonationWall placed={placed} settings={settings} wallRef={wallRef} />
      </div>

      {/* Poster */}
      {settings.posterFileUrl && (
        <div className="max-w-6xl mx-auto px-4 mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2">
              <span className="inline-block w-1 h-5 rounded" style={{ background: brand }} />
              <p className="font-semibold text-slate-700">Kampanya Afişi</p>
            </div>
            {isPdf ? (
              <div className="p-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <object
                    data={settings.posterFileUrl}
                    type="application/pdf"
                    className="w-full h-64 md:h-72"
                    aria-label={settings.posterFileName ?? "Kampanya afişi PDF önizlemesi"}
                  >
                    <div className="flex items-center gap-3 p-4 text-sm text-slate-600">
                      <div className="text-3xl">📄</div>
                      <div>
                        <p className="font-medium">{settings.posterFileName}</p>
                        <p className="text-xs text-slate-500">Tarayıcınız PDF önizlemeyi desteklemiyor.</p>
                      </div>
                    </div>
                  </object>
                </div>
                <a
                  href={settings.posterFileUrl}
                  download
                  className="self-start md:self-auto px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
                  style={{ background: brand }}
                >
                  İndir
                </a>
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.posterFileUrl} alt="Kampanya afişi" className="w-full max-h-96 object-contain bg-slate-50" />
                <a
                  href={settings.posterFileUrl}
                  download
                  className="absolute bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg"
                  style={{ background: brand }}
                >
                  İndir
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share module */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-1 h-5 rounded" style={{ background: brand }} />
            <h2 className="font-bold text-slate-700">Paylaş</h2>
          </div>
          <ShareModule
            shareText={settings.shareText}
            instagramText={settings.instagramText}
            pageUrl={pageUrl}
            brand={brand}
            seed={seed}
          />
        </div>
      </div>

      {/* Supporter showcase */}
      {donorList.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-block w-1 h-5 rounded" style={{ background: brand }} />
              <h2 className="font-bold text-slate-700">Destekçiler</h2>
              <span className="ml-auto text-xs text-slate-500">
                {donorList.length} destekçi · {totalComputers} bilgisayar
              </span>
            </div>

            {featured && (
              <FeaturedSupporter donor={featured} brand={brand} brandDark={brandDark} />
            )}

            {others.length > 0 && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {others.map((d) => (
                  <SupporterCard key={d.id} donor={d} brand={brand} />
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t-2 flex justify-between font-bold text-slate-800" style={{ borderColor: brand }}>
              <span>Toplam</span>
              <span>{totalComputers} bilgisayar</span>
            </div>
          </div>
        </div>
      )}

      {/* Reach text */}
      {settings.reachText && (
        <div className="max-w-6xl mx-auto px-4 mb-12">
          <div className="bg-white rounded-2xl p-6 text-sm text-slate-600 text-center border border-slate-200">
            {settings.reachText}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ background: brandDark }} className="text-white/80 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center">
          Manisa Celal Bayar Üniversitesi İktisadi ve İdari Bilimler Fakültesi
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({
  label,
  current,
  displayCurrent,
  goal,
  pct,
  brand,
  brandDark,
  caption,
  children,
}: {
  label: string;
  current: number;
  displayCurrent: number;
  goal: number;
  pct: number;
  brand: string;
  brandDark: string;
  caption: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="text-xs text-slate-400 tabular-nums">%{Math.min(pct, 100)}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl md:text-5xl font-black tabular-nums" style={{ color: brandDark }}>
          {formatNumber(current)}
        </span>
        <span className="text-slate-500 font-semibold tabular-nums">
          / {formatNumber(goal)}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full transition-all duration-1000"
          style={{ width: `${Math.min(pct, 100)}%`, background: brand }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {caption}
        {displayCurrent !== current ? " · güncelleniyor…" : ""}
      </p>
      {children}
    </div>
  );
}

function FeaturedSupporter({
  donor,
  brand,
  brandDark,
}: {
  donor: DonorEntry;
  brand: string;
  brandDark: string;
}) {
  const isNew = isWithinLastWeek(donor.createdAt);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5"
      style={{ background: `linear-gradient(135deg, ${brand}14 0%, ${brandDark}14 100%)` }}
    >
      <div
        className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden"
        style={{ background: donor.bgColor || "#ffffff" }}
      >
        {donor.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={donor.logoUrl} alt={donor.name} className="max-w-[80%] max-h-[80%] object-contain" />
        ) : (
          <span className="text-2xl font-black" style={{ color: brandDark }}>
            {donor.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
            style={{ background: brand }}
          >
            En büyük destekçi
          </span>
          {isNew && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              YENİ
            </span>
          )}
        </div>
        <div className="mt-1 text-xl md:text-2xl font-extrabold text-slate-800">{donor.name}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl md:text-4xl font-black tabular-nums" style={{ color: brandDark }}>
            {donor.computerCount}
          </span>
          <span className="text-sm font-semibold text-slate-500">bilgisayar</span>
        </div>
        {donor.websiteUrl && (
          <a
            href={donor.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
            style={{ color: brandDark }}
          >
            Web sitesi →
          </a>
        )}
      </div>
    </div>
  );
}

function SupporterCard({ donor, brand }: { donor: DonorEntry; brand: string }) {
  const isNew = isWithinLastWeek(donor.createdAt);
  const inner = (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
      <div
        className="w-12 h-12 shrink-0 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100"
        style={{ background: donor.bgColor || "#f8fafc" }}
      >
        {donor.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={donor.logoUrl} alt={donor.name} className="max-w-[85%] max-h-[85%] object-contain" />
        ) : (
          <span className="text-sm font-bold text-slate-600">
            {donor.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700 truncate">{donor.name}</span>
          {isNew && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
              YENİ
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 tabular-nums">{donor.computerCount} bilgisayar</div>
      </div>
      <span className="text-lg tabular-nums font-black" style={{ color: brand }}>
        {donor.computerCount}
      </span>
    </div>
  );
  if (donor.websiteUrl) {
    return (
      <a href={donor.websiteUrl} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

function isWithinLastWeek(iso: string): boolean {
  if (!iso) return false;
  const parsed = Date.parse(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= SEVEN_DAYS_MS;
}
