export type WeaponId = "rifle" | "smg" | "shot" | "sniper" | "pistol" | "burst";

export type WeaponDef = {
  id: WeaponId;
  name: string;
  short: string;
  className: string;
  blurb: string;
  mag: number;
  reserve: number;
  fireCd: number;
  reload: number;
  damage: number;
  pellets: number;
  spread: number;
  range: number;
  auto: boolean;
  recoil: number;
  move: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rifle: {
    id: "rifle",
    name: "Pulse Rifle",
    short: "AR",
    className: "Assault",
    blurb: "Balanced auto tagger. The default loadout for most ops.",
    mag: 30,
    reserve: 90,
    fireCd: 0.095,
    reload: 1.55,
    damage: 28,
    pellets: 1,
    spread: 0.012,
    range: 72,
    auto: true,
    recoil: 0.038,
    move: 1,
  },
  smg: {
    id: "smg",
    name: "Vector SMG",
    short: "SMG",
    className: "Close",
    blurb: "Blazing close-range spray. Weak past mid lane.",
    mag: 32,
    reserve: 96,
    fireCd: 0.055,
    reload: 1.25,
    damage: 18,
    pellets: 1,
    spread: 0.028,
    range: 38,
    auto: true,
    recoil: 0.028,
    move: 1.08,
  },
  shot: {
    id: "shot",
    name: "Breaker",
    short: "SG",
    className: "Shotgun",
    blurb: "Six pulse pellets. Devastating in doorways.",
    mag: 6,
    reserve: 24,
    fireCd: 0.72,
    reload: 2.1,
    damage: 16,
    pellets: 6,
    spread: 0.085,
    range: 22,
    auto: false,
    recoil: 0.09,
    move: 0.96,
  },
  sniper: {
    id: "sniper",
    name: "Longshot",
    short: "SR",
    className: "Marksman",
    blurb: "One clean tag at range. Slow cycle.",
    mag: 5,
    reserve: 20,
    fireCd: 1.15,
    reload: 2.4,
    damage: 100,
    pellets: 1,
    spread: 0.002,
    range: 90,
    auto: false,
    recoil: 0.12,
    move: 0.9,
  },
  pistol: {
    id: "pistol",
    name: "Sidearm",
    short: "P",
    className: "Pistol",
    blurb: "Always ready. Swap when the primary runs dry.",
    mag: 12,
    reserve: 48,
    fireCd: 0.16,
    reload: 1.1,
    damage: 24,
    pellets: 1,
    spread: 0.018,
    range: 42,
    auto: false,
    recoil: 0.03,
    move: 1.06,
  },
  burst: {
    id: "burst",
    name: "Carbine Burst",
    short: "BR",
    className: "Burst",
    blurb: "Three-round pulse. Rewards controlled aim.",
    mag: 24,
    reserve: 72,
    fireCd: 0.38,
    reload: 1.45,
    damage: 22,
    pellets: 3,
    spread: 0.01,
    range: 64,
    auto: false,
    recoil: 0.05,
    move: 1.02,
  },
};

export const WEAPON_ORDER: WeaponId[] = ["rifle", "smg", "shot", "sniper", "burst", "pistol"];
export const GUNGAME_ORDER: WeaponId[] = ["pistol", "smg", "rifle", "burst", "shot", "sniper"];

export function getWeapon(id: WeaponId | string | undefined): WeaponDef {
  return WEAPONS[(id as WeaponId) in WEAPONS ? (id as WeaponId) : "rifle"];
}
