import { MAP_LIST, type MapId } from "../game/maps";
import { MODE_LABEL, type GameMode, type Team } from "../game/types";

export type ServerRoom = {
  id: string;
  name: string;
  mode: GameMode;
  map: MapId;
  players: number;
  max: number;
  ping: number;
  region: string;
  open: boolean;
  owned?: boolean;
};

export type Friend = {
  id: string;
  name: string;
  status: "online" | "in-match" | "offline";
  team: Team;
};

export type FriendRequest = {
  id: string;
  name: string;
  fromMe: boolean;
};

const SERVER_KEY = "pulse-force-rooms-v1";
const FRIEND_KEY = "pulse-force-friends-v1";
const REQ_KEY = "pulse-force-requests-v1";

const REGIONS = ["NA", "EU", "AS", "SA"];
const MODES = Object.keys(MODE_LABEL) as GameMode[];
const NAMES = [
  "Pulse Hall",
  "Night Yard",
  "Frost Pit",
  "Sand Box",
  "Castle Mid",
  "Office Rush",
  "Nuke Lane",
  "Ice Duel",
  "Ruins Tag",
  "West Gate",
  "Compound",
  "Snow Town",
];

function rid() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function seedServers(): ServerRoom[] {
  return NAMES.map((name, i) => ({
    id: `SRV-${(i + 1).toString().padStart(2, "0")}`,
    name,
    mode: MODES[i % MODES.length]!,
    map: MAP_LIST[i % MAP_LIST.length]!.id,
    players: 2 + ((i * 3) % 8),
    max: 10,
    ping: 18 + ((i * 17) % 90),
    region: REGIONS[i % REGIONS.length]!,
    open: i % 7 !== 0,
  }));
}

export function loadRooms(): ServerRoom[] {
  try {
    const extra = JSON.parse(localStorage.getItem(SERVER_KEY) || "[]") as ServerRoom[];
    const seeded = seedServers();
    const mine = Array.isArray(extra) ? extra : [];
    return [...mine, ...seeded.filter((s) => !mine.some((m) => m.id === s.id))];
  } catch {
    return seedServers();
  }
}

export function saveOwnedRooms(rooms: ServerRoom[]) {
  localStorage.setItem(SERVER_KEY, JSON.stringify(rooms.filter((r) => r.owned)));
}

export function createRoom(partial: { name: string; mode: GameMode; map: MapId }): ServerRoom {
  const room: ServerRoom = {
    id: `OWN-${rid()}`,
    name: partial.name.slice(0, 24) || "Pulse Room",
    mode: partial.mode,
    map: partial.map,
    players: 1,
    max: 10,
    ping: 12,
    region: "LOCAL",
    open: true,
    owned: true,
  };
  const all = loadRooms();
  saveOwnedRooms([room, ...all.filter((r) => r.owned)]);
  return room;
}

export const DIRECTORY: Friend[] = [
  { id: "f1", name: "Scout-11", status: "online", team: "blue" },
  { id: "f2", name: "Vesper-42", status: "in-match", team: "red" },
  { id: "f3", name: "Harbor-07", status: "online", team: "blue" },
  { id: "f4", name: "Nimbus-19", status: "offline", team: "red" },
  { id: "f5", name: "Atlas-33", status: "online", team: "blue" },
  { id: "f6", name: "Quill-08", status: "offline", team: "red" },
  { id: "f7", name: "Comet-21", status: "in-match", team: "blue" },
  { id: "f8", name: "Ridge-14", status: "online", team: "red" },
];

export function loadFriends(): Friend[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FRIEND_KEY) || "[]") as Friend[];
    return Array.isArray(raw) && raw.length ? raw : DIRECTORY.slice(0, 3);
  } catch {
    return DIRECTORY.slice(0, 3);
  }
}

export function saveFriends(list: Friend[]) {
  localStorage.setItem(FRIEND_KEY, JSON.stringify(list));
}

export function loadRequests(): FriendRequest[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REQ_KEY) || "[]") as FriendRequest[];
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {
    /* ignore */
  }
  return [
    { id: "r1", name: "Bolt-05", fromMe: false },
    { id: "r2", name: "Kite-16", fromMe: true },
  ];
}

export function saveRequests(list: FriendRequest[]) {
  localStorage.setItem(REQ_KEY, JSON.stringify(list));
}

export function filterRooms(rooms: ServerRoom[], opts: { q?: string; filter?: string; mode?: string; map?: string }) {
  const q = (opts.q || "").trim().toLowerCase();
  const filter = (opts.filter || "").toLowerCase();
  return rooms.filter((r) => {
    if (q && !`${r.name} ${r.id} ${r.region} ${r.mode}`.toLowerCase().includes(q)) return false;
    if (opts.mode && r.mode !== opts.mode) return false;
    if (opts.map && r.map !== opts.map) return false;
    if (filter === "open" && !r.open) return false;
    if (filter === "full" && r.players < r.max) return false;
    if (filter === "lowping" && r.ping > 40) return false;
    if (filter === "local" && r.region !== "LOCAL") return false;
    return true;
  });
}
