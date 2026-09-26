import type { MapId } from "../game/maps";
import type { GameMode, Team } from "../game/types";

export type ServerRoom = {
  id: string;
  name: string;
  mode: GameMode;
  map: MapId;
  players: number;
  max: number;
  ping: number;
  region: string;
  country: string;
  open: boolean;
  owned?: boolean;
  kind: "local" | "online";
  ip?: string;
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

const SERVER_KEY = "pulse-force-rooms-v2";
const FRIEND_KEY = "pulse-force-friends-v1";
const REQ_KEY = "pulse-force-requests-v1";

export const COUNTRIES = [
  "INT", "US", "CA", "GB", "DE", "FR", "BR", "JP", "KR", "AU", "IN", "PH", "ID", "MX", "NL",
];

function rid() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function loadRooms(): ServerRoom[] {
  try {
    const extra = JSON.parse(localStorage.getItem(SERVER_KEY) || "[]") as ServerRoom[];
    return Array.isArray(extra) ? extra : [];
  } catch {
    return [];
  }
}

export function saveRooms(rooms: ServerRoom[]) {
  localStorage.setItem(SERVER_KEY, JSON.stringify(rooms));
}

export function createRoom(partial: {
  name: string; mode: GameMode; map: MapId; kind: "local" | "online"; country?: string; ip?: string;
}): ServerRoom {
  const room: ServerRoom = {
    id: `${partial.kind === "local" ? "LAN" : "NET"}-${rid()}`,
    name: partial.name.slice(0, 24) || "Pulse Room",
    mode: partial.mode,
    map: partial.map,
    players: 1,
    max: 10,
    ping: partial.kind === "local" ? 8 : 40,
    region: partial.kind === "local" ? "LOCAL" : (partial.country || "INT"),
    country: partial.country || (partial.kind === "local" ? "LOCAL" : "INT"),
    open: true,
    owned: true,
    kind: partial.kind,
    ip: partial.ip,
  };
  saveRooms([room, ...loadRooms().filter((r) => r.id !== room.id)]);
  return room;
}

export const DIRECTORY: Friend[] = [];

export function loadFriends(): Friend[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FRIEND_KEY) || "[]") as Friend[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveFriends(list: Friend[]) {
  localStorage.setItem(FRIEND_KEY, JSON.stringify(list));
}

export function loadRequests(): FriendRequest[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REQ_KEY) || "[]") as FriendRequest[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveRequests(list: FriendRequest[]) {
  localStorage.setItem(REQ_KEY, JSON.stringify(list));
}

export function filterRooms(rooms: ServerRoom[], opts: { q?: string; filter?: string; mode?: string; map?: string }) {
  const q = (opts.q || "").trim().toLowerCase();
  const filter = (opts.filter || "").toLowerCase();
  return rooms.filter((r) => {
    if (q && !`${r.name} ${r.id} ${r.country} ${r.ip || ""} ${r.mode}`.toLowerCase().includes(q)) return false;
    if (opts.mode && r.mode !== opts.mode) return false;
    if (opts.map && r.map !== opts.map) return false;
    if (filter === "int" && r.country !== "INT") return false;
    if (filter && filter !== "int" && filter !== "open" && r.country.toLowerCase() !== filter) return false;
    if (filter === "open" && !r.open) return false;
    return true;
  });
}
