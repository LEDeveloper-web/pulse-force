import type { MapId } from "./maps";
import type { WeaponId } from "./weapons";

export type Team = "red" | "blue";
export type GameMode =
  | "classic"
  | "resurrection"
  | "ctf"
  | "zombie"
  | "bomb"
  | "knives"
  | "deathmatch"
  | "armsrace"
  | "sniper";
export type Role = "solo" | "host" | "client";

export const MODE_LABEL: Record<GameMode, string> = {
  classic: "Classic",
  resurrection: "Resurrection",
  ctf: "Capture the Flag",
  zombie: "Zombie Mode",
  bomb: "Bomb Mode",
  knives: "Knives",
  deathmatch: "Deathmatch",
  armsrace: "Arms Race",
  sniper: "Sniper",
};

export const MODE_BLURB: Record<GameMode, string> = {
  classic: "No return. Tag every rival operator to win the round.",
  resurrection: "Team tags with a long return timer. Most tags when time ends.",
  ctf: "Steal the other flag and bring it home.",
  zombie: "One starter shadow. Tagged rangers join the hunt.",
  bomb: "Rogue plants the pulse charge. Force defuses or stops the plant.",
  knives: "Blade only. Close range tags.",
  deathmatch: "Every ranger for themselves. First to the tag limit.",
  armsrace: "Each tag upgrades your marker. Finish on the blade.",
  sniper: "Longshots, sidearm and blade only.",
};

export const MATCH = {
  duration: 240,
  tdmLimit: 30,
  ffaLimit: 15,
  ctfLimit: 3,
  kothLimit: 100,
  domLimit: 160,
  hpLimit: 120,
  ggLimit: 8,
  countdown: 3,
  respawn: 2.4,
  ressurect: 6.5,
} as const;

export function noRespawn(mode: GameMode) {
  return mode === "classic" || mode === "bomb" || mode === "knives";
}
export function ffaLike(mode: GameMode) {
  return mode === "deathmatch" || mode === "armsrace";
}
export function teamElim(mode: GameMode) {
  return mode === "classic" || mode === "bomb" || mode === "knives";
}

export type Actor = {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  isLocal: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  hp: number; alive: boolean; respawn: number; grounded: boolean;
  ammo: number; reserve: number; cooldown: number; reload: number;
  score: number; fireHeld: boolean; jumpHeld: boolean; sprint: boolean;
  moveX: number; moveY: number; flash: number; bob: number; stuck: number;
  aiTarget: string | null; aiTimer: number; carrying: Team | null;
  weapon: WeaponId; wantSlot: number;
};

export type FlagState = { team: Team; x: number; y: number; z: number; home: boolean; carrierId: string | null };
export type HillState = { owner: Team | "neutral" | "contested"; progress: number; label: string };
export type DomSite = { id: string; owner: Team | "neutral" | "contested" };
export type FeedItem = { id: number; text: string; at: number };

export type HudState = {
  hp: number; ammo: number; reserve: number; reloading: boolean;
  team: Team; mode: GameMode; scores: { red: number; blue: number };
  personal: number; timeLeft: number; countdown: number;
  alive: boolean; respawnIn: number; hitUntil: number; hurtUntil: number;
  message: string; carrying: Team | null; hill: HillState; sites: DomSite[];
  feed: FeedItem[];
  board: { id: string; name: string; team: Team; score: number; bot: boolean }[];
  locked: boolean; paused: boolean; winner: string | null; looking: boolean;
  weapon: WeaponId; weaponName: string; mapName: string; streak: number;
  money: number; vest: number; shopOpen: boolean;
};

export type NetInput = { t: "in"; mx: number; my: number; yaw: number; pitch: number; fire: boolean; jump: boolean; sprint: boolean; reload: boolean; slot: number };
export type NetActor = { id: string; name: string; team: Team; bot: boolean; x: number; y: number; z: number; yaw: number; pitch: number; hp: number; alive: boolean; score: number; carrying: Team | null; flash: number; weapon: WeaponId };
export type NetState = { t: "state"; tick: number; timeLeft: number; countdown: number; scores: { red: number; blue: number }; hill: HillState; flags: FlagState[]; actors: NetActor[]; winner: string | null; sites: DomSite[] };
export type NetHello = { t: "hello"; name: string; team: Team };
export type NetLobby = { t: "lobby"; hostId: string; mode: GameMode; mapId: MapId; botFill: boolean; players: { id: string; name: string; team: Team }[] };
export type NetStart = { t: "start"; mode: GameMode; mapId: MapId; weapon: WeaponId; seed: number; players: { id: string; name: string; team: Team; bot: boolean }[] };
export type NetFx = { t: "fx"; kind: "hit" | "tag" | "cap" | "pickup" | "return"; from?: string; to?: string; x?: number; y?: number; z?: number };
export type NetMsg = NetInput | NetState | NetHello | NetLobby | NetStart | NetFx | { t: "end" };

export type EngineConfig = {
  canvas: HTMLCanvasElement;
  role: Role;
  mode: GameMode;
  mapId: MapId;
  weapon: WeaponId;
  loadout?: WeaponId[];
  lookScale?: number;
  invertY?: boolean;
  startMoney?: number;
  team: Team;
  playerName: string;
  selfId: string;
  botFill: boolean;
  botCount?: number;
  seed?: number;
  roster?: { id: string; name: string; team: Team; bot: boolean }[];
  onHud: (hud: HudState) => void;
  onMatchEnd: (winner: string) => void;
  broadcast?: (data: unknown) => void;
  sendReliable?: (data: unknown, peerId?: string) => void;
};

declare global {
  interface Window {
    __pulseArena?: {
      started: boolean;
      mode: GameMode;
      setPaused?: (v: boolean) => void;
      setMuted?: (v: boolean) => void;
      buy?: (id: string) => boolean;
      toggleShop?: () => void;
    };
    __pulseBuy?: (id: string) => boolean;
  }
}
