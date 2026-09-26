export type WeaponId =
  | "knife" | "pm" | "p228" | "glock" | "p99" | "deagle" | "usp"
  | "tmp" | "mp5" | "p90" | "ump"
  | "dbarrel" | "spas" | "super90"
  | "m16" | "ak47" | "m4" | "hk416" | "aug"
  | "m24" | "scout" | "awp"
  | "m249"
  | "rifle" | "smg" | "shot" | "pistol" | "burst" | "sniper";

export type ShopTab = "melee" | "pistol" | "smg" | "shot" | "rifle" | "sniper" | "heavy" | "gear";

export type WeaponDef = {
  id: WeaponId; name: string; short: string; tab: ShopTab; blurb: string;
  mag: number; reserve: number; fireCd: number; reload: number; damage: number;
  pellets: number; spread: number; range: number; auto: boolean; recoil: number; move: number; price: number;
};

const W = (id: WeaponId, name: string, tab: ShopTab, price: number, mag: number, reserve: number, fireCd: number, reload: number, damage: number, extra: Partial<WeaponDef> = {}): WeaponDef => ({
  id, name, short: name, tab, blurb: name, mag, reserve, fireCd, reload, damage,
  pellets: 1, spread: 0.016, range: 60, auto: tab === "smg" || tab === "rifle" || tab === "heavy" || id === "glock",
  recoil: 0.04, move: 1, price, ...extra,
});

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  knife: W("knife", "Knife", "melee", 0, 1, 0, 0.42, 0.2, 55, { auto: false, spread: 0.002, range: 2.4, move: 1.12, reserve: 0 }),
  pm: W("pm", "PM", "pistol", 300, 8, 120, 0.18, 1.1, 34, { auto: false, range: 40 }),
  p228: W("p228", "P228", "pistol", 500, 13, 130, 0.16, 1.15, 28, { auto: false }),
  glock: W("glock", "Glock", "pistol", 700, 20, 160, 0.08, 1.2, 18, { auto: true, spread: 0.024 }),
  p99: W("p99", "P99", "pistol", 700, 10, 100, 0.15, 1.15, 32, { auto: false }),
  deagle: W("deagle", "Desert Eagle", "pistol", 700, 7, 70, 0.28, 1.35, 58, { auto: false, recoil: 0.08, spread: 0.02 }),
  usp: W("usp", "USP", "pistol", 700, 12, 120, 0.16, 1.2, 30, { auto: false }),
  tmp: W("tmp", "TMP", "smg", 1000, 30, 210, 0.055, 1.2, 16, { spread: 0.03, range: 36, move: 1.08 }),
  mp5: W("mp5", "MP5", "smg", 1500, 30, 210, 0.07, 1.3, 20, { spread: 0.022, range: 42 }),
  p90: W("p90", "P90", "smg", 2100, 50, 200, 0.06, 1.45, 18, { spread: 0.026, range: 40 }),
  ump: W("ump", "UMP45", "smg", 2100, 25, 250, 0.085, 1.35, 24, { range: 44 }),
  dbarrel: W("dbarrel", "Double Barrel", "shot", 1000, 2, 48, 0.55, 2.1, 18, { pellets: 8, spread: 0.1, range: 16, auto: false, recoil: 0.1 }),
  spas: W("spas", "SPAS-12", "shot", 2500, 8, 48, 0.7, 2.2, 16, { pellets: 7, spread: 0.08, range: 20, auto: false }),
  super90: W("super90", "M4 Super 90", "shot", 3500, 7, 49, 0.62, 2.0, 15, { pellets: 7, spread: 0.075, range: 22, auto: false }),
  m16: W("m16", "M16", "rifle", 2500, 20, 160, 0.1, 1.5, 28, { spread: 0.012, range: 70 }),
  ak47: W("ak47", "AK-47", "rifle", 2500, 30, 150, 0.1, 1.55, 32, { spread: 0.016, recoil: 0.055, range: 68 }),
  m4: W("m4", "M4A4", "rifle", 3000, 30, 150, 0.09, 1.5, 27, { spread: 0.012, range: 70 }),
  hk416: W("hk416", "HK416", "rifle", 3500, 30, 150, 0.088, 1.48, 29, { range: 72 }),
  aug: W("aug", "AUG", "rifle", 4000, 30, 150, 0.095, 1.6, 31, { spread: 0.01, range: 74, move: 0.96 }),
  m24: W("m24", "M24", "sniper", 1500, 5, 50, 1.05, 2.2, 90, { auto: false, spread: 0.002, range: 95, recoil: 0.12, move: 0.9 }),
  scout: W("scout", "Scout", "sniper", 3000, 10, 50, 1.2, 2.3, 70, { auto: false, spread: 0.003, range: 92, move: 0.94 }),
  awp: W("awp", "AWP", "sniper", 5000, 10, 50, 1.35, 2.5, 100, { auto: false, spread: 0.001, range: 100, recoil: 0.16, move: 0.86 }),
  m249: W("m249", "M249", "heavy", 5000, 100, 300, 0.08, 3.2, 26, { spread: 0.028, recoil: 0.06, range: 62, move: 0.84 }),
  rifle: W("rifle", "M16", "rifle", 2500, 20, 160, 0.1, 1.5, 28, { spread: 0.012, range: 70 }),
  smg: W("smg", "MP5", "smg", 1500, 30, 210, 0.07, 1.3, 20, { spread: 0.022, range: 42 }),
  shot: W("shot", "SPAS-12", "shot", 2500, 8, 48, 0.7, 2.2, 16, { pellets: 7, spread: 0.08, range: 20, auto: false }),
  pistol: W("pistol", "PM", "pistol", 300, 8, 120, 0.18, 1.1, 34, { auto: false, range: 40 }),
  burst: W("burst", "M16", "rifle", 2500, 20, 160, 0.1, 1.5, 28),
  sniper: W("sniper", "M24", "sniper", 1500, 5, 50, 1.05, 2.2, 90, { auto: false, spread: 0.002, range: 95, recoil: 0.12, move: 0.9 }),
};

export const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "pistol", label: "Pistols" }, { id: "smg", label: "SMG" }, { id: "shot", label: "Shotgun" },
  { id: "rifle", label: "Rifles" }, { id: "sniper", label: "Sniper" }, { id: "heavy", label: "Machine" },
  { id: "melee", label: "Knives" }, { id: "gear", label: "Gear" },
];

export const WEAPON_ORDER = Object.keys(WEAPONS) as WeaponId[];
export const GUNGAME_ORDER: WeaponId[] = ["glock", "tmp", "mp5", "m16", "ak47", "m24", "awp", "knife"];
export function shopOf(tab: ShopTab) { return WEAPON_ORDER.map((id) => WEAPONS[id]).filter((w) => w.tab === tab); }
export function getWeapon(id: WeaponId | string | undefined): WeaponDef {
  return WEAPONS[(id as WeaponId) in WEAPONS ? (id as WeaponId) : "pm"];
}
export function startWeapon(mode: string): WeaponId {
  if (mode === "knives") return "knife";
  if (mode === "sniper") return "m24";
  if (mode === "armsrace") return GUNGAME_ORDER[0]!;
  return "pm";
}
export const GEAR = [
  { id: "vest50", name: "Vest 50%", price: 500, vest: 50 },
  { id: "vest100", name: "Vest 100%", price: 1000, vest: 100 },
  { id: "vest150", name: "Vest 150%", price: 1500, vest: 150 },
  { id: "ammo", name: "Ammo pack", price: 400, vest: 0 },
] as const;
