import type { Donor, Layout } from "./schema";

export type PlacedDonor = {
  donor: Donor;
  row: number;
  col: number;
  width: number;
  height: number;
  isManual: boolean;
};

export type LayoutResult = {
  placed: PlacedDonor[];
  errors: { donorId: string; name: string; reason: string }[];
  grid: (string | null)[][];
};

// Deterministic PRNG seeded by a string — layout stays stable until donor set changes.
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRectOptions(
  count: number,
  maxCols: number,
  maxRows: number,
  logoAspect: number | null
): { w: number; h: number }[] {
  const options: { w: number; h: number; score: number }[] = [];
  for (let w = 1; w <= maxCols; w++) {
    for (let h = 1; h <= maxRows; h++) {
      if (w * h !== count) continue;
      let score: number;
      if (logoAspect && logoAspect > 0) {
        const rectAspect = w / h;
        score = Math.abs(Math.log(rectAspect) - Math.log(logoAspect));
      } else {
        score = Math.abs(w - h);
      }
      options.push({ w, h, score });
    }
  }
  options.sort((a, b) => a.score - b.score);
  return options.map(({ w, h }) => ({ w, h }));
}

function findAllFreeSlots(
  grid: (string | null)[][],
  rows: number,
  cols: number,
  w: number,
  h: number
): { r: number; c: number }[] {
  const slots: { r: number; c: number }[] = [];
  for (let r = 0; r <= rows - h; r++) {
    for (let c = 0; c <= cols - w; c++) {
      let fits = true;
      outer: for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) {
          if (grid[r + dr][c + dc] !== null) {
            fits = false;
            break outer;
          }
        }
      }
      if (fits) slots.push({ r, c });
    }
  }
  return slots;
}

function placeOnGrid(
  grid: (string | null)[][],
  donorId: string,
  r: number,
  c: number,
  w: number,
  h: number
) {
  for (let dr = 0; dr < h; dr++) {
    for (let dc = 0; dc < w; dc++) {
      grid[r + dr][c + dc] = donorId;
    }
  }
}

export function computeLayout(
  donors: Donor[],
  manualLayouts: Layout[],
  gridCols: number,
  gridRows: number,
  seedOverride?: string
): LayoutResult {
  const grid: (string | null)[][] = Array.from({ length: gridRows }, () =>
    Array(gridCols).fill(null)
  );

  const placed: PlacedDonor[] = [];
  const errors: LayoutResult["errors"] = [];

  const manualMap = new Map(manualLayouts.map((l) => [l.donor_id, l]));
  const activeDonors = donors.filter((d) => d.is_active);

  const seedStr = seedOverride
    ? seedOverride
    : [...activeDonors.map((d) => d.id).sort(), gridCols, gridRows].join("|");
  const rand = seededRandom(seedStr);

  // 1. Place manual layouts first (these are pinned by admin)
  for (const donor of activeDonors) {
    const manual = manualMap.get(donor.id);
    if (!manual || !manual.manual_override) continue;

    const { row_start: r, col_start: c, width: w, height: h } = manual;

    if (r < 0 || c < 0 || r + h > gridRows || c + w > gridCols) {
      errors.push({ donorId: donor.id, name: donor.name, reason: "Manuel yerleşim grid dışında." });
      continue;
    }

    let conflict = false;
    for (let dr = 0; dr < h && !conflict; dr++) {
      for (let dc = 0; dc < w; dc++) {
        if (grid[r + dr][c + dc] !== null) { conflict = true; break; }
      }
    }

    if (conflict) {
      errors.push({ donorId: donor.id, name: donor.name, reason: "Manuel yerleşim başka bağışçıyla çakışıyor." });
      continue;
    }

    placeOnGrid(grid, donor.id, r, c, w, h);
    placed.push({ donor, row: r, col: c, width: w, height: h, isManual: true });
  }

  // 2. Randomize auto-placement. Sort by computer_count DESC so large blocks fit first,
  //    but shuffle within each size bucket and pick random valid slot per donor.
  const manualPlacedIds = new Set(placed.map((p) => p.donor.id));
  const autoQueue = activeDonors.filter((d) => {
    const manual = manualMap.get(d.id);
    return !manualPlacedIds.has(d.id) && !(manual?.manual_override);
  });

  // Bucket by size, shuffle within each bucket
  const buckets = new Map<number, Donor[]>();
  for (const d of autoQueue) {
    const list = buckets.get(d.computer_count) ?? [];
    list.push(d);
    buckets.set(d.computer_count, list);
  }
  const orderedQueue: Donor[] = [];
  const sizes = [...buckets.keys()].sort((a, b) => b - a);
  for (const size of sizes) {
    orderedQueue.push(...shuffle(buckets.get(size)!, rand));
  }

  for (const donor of orderedQueue) {
    const rectOptions = getRectOptions(donor.computer_count, gridCols, gridRows, donor.logo_aspect);
    if (rectOptions.length === 0) {
      errors.push({
        donorId: donor.id,
        name: donor.name,
        reason: `${donor.computer_count} bilgisayar için uygun dikdörtgen bulunamadı.`,
      });
      continue;
    }

    // Collect all valid placements across all rect shapes, pick a random one.
    type Placement = { w: number; h: number; r: number; c: number };
    const allPlacements: Placement[] = [];
    for (const { w, h } of rectOptions) {
      const slots = findAllFreeSlots(grid, gridRows, gridCols, w, h);
      for (const s of slots) allPlacements.push({ w, h, r: s.r, c: s.c });
      // Prefer near-square shapes: if we have placements for the most balanced shape, stop.
      if (allPlacements.length > 0 && rectOptions[0].w === w && rectOptions[0].h === h) break;
    }
    if (allPlacements.length === 0) {
      // Fall back: try all rect shapes
      for (const { w, h } of rectOptions) {
        const slots = findAllFreeSlots(grid, gridRows, gridCols, w, h);
        for (const s of slots) allPlacements.push({ w, h, r: s.r, c: s.c });
      }
    }

    if (allPlacements.length === 0) {
      errors.push({ donorId: donor.id, name: donor.name, reason: "Gridte yeterli boş alan yok." });
      continue;
    }

    const pick = allPlacements[Math.floor(rand() * allPlacements.length)];
    placeOnGrid(grid, donor.id, pick.r, pick.c, pick.w, pick.h);
    placed.push({ donor, row: pick.r, col: pick.c, width: pick.w, height: pick.h, isManual: false });
  }

  return { placed, errors, grid };
}

export function countFreeCells(grid: (string | null)[][]): number {
  return grid.flat().filter((c) => c === null).length;
}
