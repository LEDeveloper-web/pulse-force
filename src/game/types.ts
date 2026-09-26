import type { MapId } from "./maps";
import type { WeaponId } from "./weapons";

export type Team = "red" | "blue";
export type GameMode = "tdm" | "ctf" | "koth" | "ffa" | "dom" | "hp" | "gg" | "inf";
export type Role = "solo" | "host" | "client";

export const MODE_LABEL: Record<GameMode, string> = {
  tdm: "Team Deathmatch",
  ctf: "Capture the Flag",
  koth: "King of the Hill",
  ffa: "Free For All",
  dom: "Domination",
  hp: "Hardpoint",
  gg: "Gun Game",
  inf: "Infection",
};

export const MODE_BLURB: Record<GameMode, string> = {
  tdm: "Tag rival operators. First team to the limit wins.",
  ctf: "Steal the other team's flag and bring it home.",
  koth: "Hold the center pad to bank points.",
  ffa: "Every ranger for themselves. First to the tag limit wins.",
  dom: "Own sites A, B and C. Points tick while you hold them.",
  hp: "The hot zone rotates. Stack the hill, rotate fast.",
  gg: "Each tag upgrades your weapon. Finish the ladder.",
  inf: "One starter hunter. Tagged rangers join the hunt.",
};

export const MATCH = {
  duration: 240,
  tdmLimit: 30,
  ffaLimit: 15,
  ctfLimit: 3,
  kothLimit: 100,
  domLimit: 160,
  hpLimit: 120,
  ggLimit: 6,
  countdown: 3,
  respawn: 2.4,
} as const;

export type Actor = {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  isLocal: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  hp: number;
  alive: boolean;
  respawn: number;
  grounded: boolean;
  ammo: number;
  reserve: number;
  cooldown: number;
  reload: number;
  score: number;
  fireHeld: boolean;
  jumpHeld: boolean;
  sprint: boolean;
  moveX: number;
  moveY: number;
  flash: number;
  bob: number;
  stuck: number;
  aiTarget: string | null;
  aiTimer: number;
  carrying: Team | null;
  weapon: WeaponId;
  wantSlot: number;
};

export type FlagState = {
  team: Team;
  x: number;
  y: number;
  z: number;
  home: boolean;
  carrierId: string | null;
};

export type HillState = {
  owner: Team | "neutral" | "contested";
  progress: number;
  label: string;
};

export type DomSite = {
  id: string;
  owner: Team | "neutral" | "contested";
};

export type FeedItem = { id: number; text: string; at: number };

export type HudState = {
  hp: number;
  ammo: number;
  reserve: number;
  reloading: boolean;
  team: Team;
  mode: GameMode;
  scores: { red: number; blue: number };
  personal: number;
  timeLeft: number;
  countdown: number;
  alive: boolean;
  respawnIn: number;
  hitUntil: number;
  hurtUntil: number;
  message: string;
  carrying: Team | null;
  hill: HillState;
  sites: DomSite[];
  feed: FeedItem[];
  board: { id: string; name: string; team: Team; score: number; bot: boolean }[];
  locked: boolean;
  paused: boolean;
  winner: string | null;
  looking: boolean;
  weapon: WeaponId;
  weaponName: string;
  mapName: string;
  streak: number;
};

export type NetInput = {
  t: "in";
  mx: number;
  my: number;
  yaw: number;
  pitch: number;
  fire: boolean;
  jump: boolean;
  sprint: boolean;
  reload: boolean;
  slot: number;
};

export type NetActor = {
  id: string;
  name: string;
  team: Team;
  bot: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  alive: boolean;
  score: number;
  carrying: Team | null;
  flash: number;
  weapon: WeaponId;
};

export type NetState = {
  t: "state";
  tick: number;
  timeLeft: number;
  countdown: number;
  scores: { red: number; blue: number };
  hill: HillState;
  flags: FlagState[];
  actors: NetActor[];
  winner: string | null;
  sites: DomSite[];
};

export type NetHello = {
  t: "hello";
  name: string;
  team: Team;
};

export type NetLobby = {
  t: "lobby";
  hostId: string;
  mode: GameMode;
  mapId: MapId;
  botFill: boolean;
  players: { id: string; name: string; team: Team }[];
};

export type NetStart = {
  t: "start";
  mode: GameMode;
  mapId: MapId;
  weapon: WeaponId;
  seed: number;
  players: { id: string; name: string; team: Team; bot: boolean }[];
};

export type NetFx = {
  t: "fx";
  kind: "hit" | "tag" | "cap" | "pickup" | "return";
  from?: string;
  to?: string;
  x?: number;
  y?: number;
  z?: number;
};

export type NetMsg = NetInput | NetState | NetHello | NetLobby | NetStart | NetFx | { t: "end" };

export type EngineConfig = {
  canvas: HTMLCanvasElement;
  role: Role;
  mode: GameMode;
  mapId: MapId;
  weapon: WeaponId;
  team: Team;
  playerName: string;
  selfId: string;
  botFill: boolean;
  seed?: number;
  roster?: { id: string; name: string; team: Team; bot: boolean }[];
  onHud: (hud: HudState) => void;
  onMatchEnd: (winner: string) => void;
  broadcast?: (data: unknown) => void;
  sendReliable?: (data: unknown, peerId?: string) => void;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPos: () => { x: number; y: number; z: number };
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __pulseArena?: {
      started: boolean;
      mode: GameMode;
      setPaused?: (v: boolean) => void;
      setMuted?: (v: boolean) => void;
    };
  }
}
