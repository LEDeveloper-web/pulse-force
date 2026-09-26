import { WEAPONS, WEAPON_ORDER, type WeaponId } from "./weapons";

export type RankId = "recruit" | "ranger" | "operator" | "veteran" | "elite" | "commander";

export type Profile = {
  name: string;
  credits: number;
  xp: number;
  owned: WeaponId[];
  primary: WeaponId;
  secondary: WeaponId;
  lookScale: number;
  invertY: boolean;
  muted: boolean;
};

const KEY = "pulse-force-profile-v1";

export const RANKS: { id: RankId; name: string; xp: number }[] = [
  { id: "recruit", name: "Recruit", xp: 0 },
  { id: "ranger", name: "Ranger", xp: 200 },
  { id: "operator", name: "Operator", xp: 500 },
  { id: "veteran", name: "Veteran", xp: 1000 },
  { id: "elite", name: "Elite", xp: 1800 },
  { id: "commander", name: "Commander", xp: 3000 },
];

export const STARTER: Profile = {
  name: "Ranger-01",
  credits: 420,
  xp: 0,
  owned: ["rifle", "pistol"],
  primary: "rifle",
  secondary: "pistol",
  lookScale: 1.15,
  invertY: false,
  muted: false,
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...STARTER, owned: [...STARTER.owned] };
    const p = JSON.parse(raw) as Partial<Profile>;
    const owned = Array.isArray(p.owned)
      ? (p.owned.filter((id) => id in WEAPONS) as WeaponId[])
      : [...STARTER.owned];
    if (!owned.includes("rifle")) owned.push("rifle");
    if (!owned.includes("pistol")) owned.push("pistol");
    const primary = owned.includes(p.primary as WeaponId) ? (p.primary as WeaponId) : "rifle";
    const secondary = owned.includes(p.secondary as WeaponId) ? (p.secondary as WeaponId) : "pistol";
    return {
      name: String(p.name || STARTER.name).slice(0, 16),
      credits: Math.max(0, Math.floor(Number(p.credits) || 0)),
      xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
      owned,
      primary,
      secondary: secondary === primary ? "pistol" : secondary,
      lookScale: Math.max(0.35, Math.min(2.6, Number(p.lookScale) || 1.15)),
      invertY: Boolean(p.invertY),
      muted: Boolean(p.muted),
    };
  } catch {
    return { ...STARTER, owned: [...STARTER.owned] };
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function rankFor(xp: number) {
  let current = RANKS[0]!;
  let next = RANKS[1] ?? null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i]!.xp) {
      current = RANKS[i]!;
      next = RANKS[i + 1] ?? null;
    }
  }
  const span = (next?.xp ?? current.xp + 1) - current.xp;
  const into = xp - current.xp;
  return { current, next, pct: next ? Math.min(1, into / span) : 1 };
}

export function weaponPrice(id: WeaponId) {
  return WEAPONS[id].price;
}

export function shopList() {
  return WEAPON_ORDER.map((id) => WEAPONS[id]);
}

export function payout(score: number, won: boolean) {
  const credits = 70 + score * 14 + (won ? 50 : 0);
  const xp = 25 + score * 8 + (won ? 40 : 0);
  return { credits, xp };
}
