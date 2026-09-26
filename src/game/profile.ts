import { WEAPONS, type WeaponId } from "./weapons";
import type { GameMode } from "./types";

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
  startMoney: number;
  character: string;
  autoFire: boolean;
};

const KEY = "pulse-force-profile-v2";

export const RANKS: { id: RankId; name: string; xp: number }[] = [
  { id: "recruit", name: "Recruit", xp: 0 },
  { id: "ranger", name: "Ranger", xp: 200 },
  { id: "operator", name: "Operator", xp: 500 },
  { id: "veteran", name: "Veteran", xp: 1000 },
  { id: "elite", name: "Elite", xp: 1800 },
  { id: "commander", name: "Commander", xp: 3000 },
];

export const BLUE_CHARS = ["Alpha", "Vympel", "Seal", "Delta", "SAS", "Ghost", "Sentinel", "Apex"];
export const RED_CHARS = ["Rogue", "Shadow", "Outlaw", "Nomad", "Wraith", "Recon", "Viper", "Specter"];

export const STARTER: Profile = {
  name: "Ranger-01",
  credits: 800,
  xp: 0,
  owned: ["knife", "pm"],
  primary: "pm",
  secondary: "knife",
  lookScale: 1.2,
  invertY: false,
  muted: false,
  startMoney: 800,
  character: "Alpha",
  autoFire: false,
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("pulse-force-profile-v1");
    if (!raw) return { ...STARTER, owned: [...STARTER.owned] };
    const p = JSON.parse(raw) as Partial<Profile>;
    const owned = Array.isArray(p.owned)
      ? (p.owned.filter((id) => id in WEAPONS) as WeaponId[])
      : [...STARTER.owned];
    if (!owned.includes("knife")) owned.push("knife");
    if (!owned.includes("pm")) owned.push("pm");
    const primary = owned.includes(p.primary as WeaponId) ? (p.primary as WeaponId) : "pm";
    const secondary = owned.includes(p.secondary as WeaponId) ? (p.secondary as WeaponId) : "knife";
    return {
      name: String(p.name || STARTER.name).slice(0, 16),
      credits: Math.max(0, Math.floor(Number(p.credits) || 0)),
      xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
      owned,
      primary,
      secondary: secondary === primary ? "knife" : secondary,
      lookScale: Math.max(0.35, Math.min(2.6, Number(p.lookScale) || 1.2)),
      invertY: Boolean(p.invertY),
      muted: Boolean(p.muted),
      startMoney: Math.max(400, Math.min(8000, Number(p.startMoney) || 800)),
      character: String(p.character || "Alpha").slice(0, 16),
      autoFire: Boolean(p.autoFire),
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
  return { current, next, pct: next ? Math.min(1, (xp - current.xp) / span) : 1 };
}

export function payout(score: number, won: boolean, _mode?: GameMode) {
  return {
    credits: 80 + score * 16 + (won ? 60 : 0),
    xp: 28 + score * 8 + (won ? 40 : 0),
  };
}
