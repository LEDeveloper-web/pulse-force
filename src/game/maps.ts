import type { Team } from "./types";

export type Solid = {
  minx: number; miny: number; minz: number;
  maxx: number; maxy: number; maxz: number;
  kind: "wall" | "crate" | "hill" | "base" | "trim";
  team?: Team;
};

export type MapId =
  | "newdesert" | "newbigdesert" | "desert4" | "room" | "desert3" | "nuke"
  | "winter" | "office" | "maze" | "ruins2" | "west" | "bigdesert"
  | "spaniard2" | "house" | "versus" | "factory" | "desert2" | "desert"
  | "castle" | "threek" | "snowmap" | "bunker" | "snowtown" | "ruins"
  | "assaulthouse" | "tundra" | "fighter" | "spaniard" | "iceworld" | "compound";

export type Zone = { id: string; x: number; z: number; r: number };

export type ArenaMap = {
  id: MapId; name: string; code: string; blurb: string; size: number; bg: number; fogFar: number; floor: number;
  solids: Solid[]; flagHome: Record<Team, { x: number; y: number; z: number }>;
  hill: { x: number; y: number; z: number; r: number }; points: Zone[]; hardpoints: Zone[]; bombOk?: boolean;
};

function solid(x: number, y: number, z: number, w: number, h: number, d: number, kind: Solid["kind"], team?: Team): Solid {
  return { minx: x - w / 2, miny: y, minz: z - d / 2, maxx: x + w / 2, maxy: y + h, maxz: z + d / 2, kind, team };
}
function perimeter(size: number, h = 6): Solid[] {
  return [
    solid(0, 0, -size - 0.7, size * 2 + 2.8, h, 1.4, "wall"),
    solid(0, 0, size + 0.7, size * 2 + 2.8, h, 1.4, "wall"),
    solid(-size - 0.7, 0, 0, 1.4, h, size * 2, "wall"),
    solid(size + 0.7, 0, 0, 1.4, h, size * 2, "wall"),
  ];
}
type Layout = "hall" | "yard" | "ware" | "docks" | "rooms";
function layout(kind: Layout, size: number): Solid[] {
  const s = size;
  if (kind === "hall") return [...perimeter(s), solid(-s * 0.43, 0, 0, 1.2, 2.3, s * 0.34, "wall"), solid(s * 0.43, 0, 0, 1.2, 2.3, s * 0.34, "wall"), solid(0, 0, -s * 0.38, s * 0.3, 1.15, 1.15, "crate"), solid(0, 0, s * 0.38, s * 0.3, 1.15, 1.15, "crate"), solid(0, 0, 0, s * 0.42, 1.1, s * 0.42, "hill"), solid(-s * 0.72, 0, -s * 0.45, 1.1, 3.2, s * 0.36, "wall"), solid(s * 0.72, 0, s * 0.45, 1.1, 3.2, s * 0.36, "wall"), solid(-6, 0, -s * 0.64, 2.2, 1.1, 2.2, "crate"), solid(6, 0, s * 0.64, 2.2, 1.1, 2.2, "crate")];
  if (kind === "yard") return [...perimeter(s), solid(0, 0, 0, 6.5, 0.6, 6.5, "hill"), solid(-s * 0.35, 0, -s * 0.35, 1.4, 2.2, 1.4, "wall"), solid(s * 0.35, 0, -s * 0.35, 1.4, 2.2, 1.4, "wall"), solid(-s * 0.35, 0, s * 0.35, 1.4, 2.2, 1.4, "wall"), solid(s * 0.35, 0, s * 0.35, 1.4, 2.2, 1.4, "wall"), solid(-s * 0.6, 0, 0, 4, 1.2, 1.6, "crate"), solid(s * 0.6, 0, 0, 4, 1.2, 1.6, "crate")];
  if (kind === "ware") return [...perimeter(s), solid(-s * 0.33, 0, -s * 0.25, 3.2, 2.4, 8, "crate"), solid(s * 0.33, 0, s * 0.25, 3.2, 2.4, 8, "crate"), solid(0, 0, -s * 0.5, 1.2, 3.6, s * 0.42, "wall"), solid(0, 0, s * 0.5, 1.2, 3.6, s * 0.42, "wall"), solid(-s * 0.75, 0, 0, 2.4, 1.8, 6, "crate"), solid(s * 0.75, 0, 0, 2.4, 1.8, 6, "crate")];
  if (kind === "docks") return [...perimeter(s), solid(-s * 0.43, 0, 0, 2.2, 2.8, s * 0.7, "wall"), solid(s * 0.43, 0, 0, 2.2, 2.8, s * 0.7, "wall"), solid(0, 0, -s * 0.35, 6, 1.3, 2.2, "crate"), solid(0, 0, s * 0.35, 6, 1.3, 2.2, "crate"), solid(0, 0, 0, 3.4, 0.4, 3.4, "hill")];
  return [...perimeter(s), solid(-s * 0.33, 0, -s * 0.22, s * 0.44, 3.2, 1.1, "wall"), solid(s * 0.33, 0, s * 0.22, s * 0.44, 3.2, 1.1, "wall"), solid(-s * 0.22, 0, s * 0.33, 1.1, 3.2, s * 0.39, "wall"), solid(s * 0.22, 0, -s * 0.33, 1.1, 3.2, s * 0.39, "wall"), solid(0, 0, 0, 3.2, 0.5, 3.2, "hill")];
}
function make(id: MapId, name: string, code: string, blurb: string, kind: Layout, size: number, bg: number, floor: number, bombOk = false): ArenaMap {
  const edge = size * 0.82;
  return {
    id, name, code, blurb, size, bg, fogFar: size * 2.6, floor, bombOk,
    flagHome: { red: { x: 0, y: 0, z: -edge }, blue: { x: 0, y: 0, z: edge } },
    hill: { x: 0, y: kind === "hall" ? 1.1 : 0, z: 0, r: 3.6 },
    points: [{ id: "A", x: -size * 0.45, z: -size * 0.2, r: 2.8 }, { id: "B", x: size * 0.45, z: size * 0.2, r: 2.8 }, { id: "C", x: 0, z: 0, r: 3 }],
    hardpoints: [{ id: "MID", x: 0, z: 0, r: 3.4 }, { id: "N", x: 0, z: -size * 0.5, r: 2.8 }, { id: "S", x: 0, z: size * 0.5, r: 2.8 }],
    solids: [...layout(kind, size), solid(-3.2, 0, -edge - 0.2, 1.3, 2.6, 1.3, "base", "red"), solid(3.2, 0, -edge - 0.2, 1.3, 2.6, 1.3, "base", "red"), solid(-3.2, 0, edge + 0.2, 1.3, 2.6, 1.3, "base", "blue"), solid(3.2, 0, edge + 0.2, 1.3, 2.6, 1.3, "base", "blue")],
  };
}
export const MAP_LIST: ArenaMap[] = [
  make("room", "Room", "RM", "Tight indoor box fight.", "rooms", 16, 0x101014, 0xc4c4cc),
  make("office", "Office", "OF", "Desks, halls, close angles.", "rooms", 18, 0x12141a, 0xb8b8c0),
  make("house", "House", "HS", "Rooms and a yard choke.", "rooms", 17, 0x14110e, 0xb0a090),
  make("assaulthouse", "Assault House", "AH", "Stacked rooms, short lanes.", "rooms", 17, 0x16120f, 0xa89888),
  make("factory", "Factory", "FC", "Long crate lanes.", "ware", 24, 0x12100c, 0xb8b0a0),
  make("nuke", "Nuke", "NK", "Split levels and side halls.", "ware", 23, 0x10140f, 0x9aaa90, true),
  make("west", "West", "WT", "Open mid with side cover.", "docks", 23, 0x16140c, 0xc2b48a, true),
  make("versus", "Versus", "VS", "Symmetrical duel yard.", "yard", 18, 0x101014, 0xc8c8d0),
  make("maze", "Maze", "MZ", "Crate warehouse maze.", "ware", 20, 0x10100e, 0xb0a898),
  make("castle", "Castle", "CS", "Stone walls and mid court.", "yard", 22, 0x121018, 0xa8a0b0),
  make("bunker", "Bunker", "BK", "Low halls and tight doors.", "rooms", 16, 0x0e120e, 0x889080),
  make("compound", "Compound", "CP", "Choke doors and rooms.", "rooms", 18, 0x12100e, 0xb0a898),
  make("desert", "Desert", "DS", "Sand lanes and mid crates.", "yard", 22, 0x1a160c, 0xd2c08a),
  make("desert2", "Desert2", "D2", "Wide sand with two sites.", "docks", 24, 0x1c180c, 0xd6c48e, true),
  make("desert3", "Desert3", "D3", "Mirage-style mid and sites.", "hall", 24, 0x1a160a, 0xd0be86, true),
  make("desert4", "Desert4", "D4", "Newer desert layout.", "ware", 23, 0x18140a, 0xccba82),
  make("bigdesert", "BigDesert", "BD", "Huge sand bowl.", "yard", 26, 0x1c1808, 0xd8c690, true),
  make("newdesert", "NewDesert", "ND", "Updated desert mid.", "hall", 24, 0x1a160c, 0xd2c08a),
  make("newbigdesert", "NewBigDesert", "NB", "Wide new desert.", "yard", 26, 0x1c180a, 0xd6c48c),
  make("spaniard", "Spaniard", "SP", "Town alleys.", "rooms", 20, 0x16120e, 0xc0b090),
  make("spaniard2", "Spaniard2", "S2", "Town sites and alleys.", "hall", 22, 0x16120c, 0xc2b292, true),
  make("ruins", "Ruins", "RU", "Broken walls.", "yard", 21, 0x14120e, 0xb8b0a0),
  make("ruins2", "Ruins2", "R2", "Tighter ruin lanes.", "ware", 20, 0x12100c, 0xb4aa98),
  make("winter", "Winter", "WN", "Snow yard.", "yard", 22, 0x101418, 0xd8e0e8),
  make("snowmap", "SnowMap", "SM", "Open snow field.", "yard", 24, 0x10161c, 0xd0dce8),
  make("snowtown", "SnowTown", "ST", "Snow streets.", "rooms", 20, 0x10141a, 0xc8d4e0),
  make("tundra", "Tundra", "TD", "Cold open mid.", "docks", 23, 0x0e1418, 0xc0ccd4),
  make("iceworld", "IceWorld", "IW", "Icy sightlines.", "hall", 22, 0x0c141c, 0xd0dce8),
  make("threek", "3000$", "3K", "Close cash arena.", "rooms", 15, 0x12100c, 0xc8b070),
  make("fighter", "Fighter", "FT", "Duel pit.", "yard", 16, 0x141010, 0xb09090),
];
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m])) as Record<MapId, ArenaMap>;
export const BOMB_MAPS = MAP_LIST.filter((m) => m.bombOk).map((m) => m.id);
export function getMap(id: string | undefined): ArenaMap { return MAPS[(id as MapId) in MAPS ? (id as MapId) : "room"]; }
export function spawnPoint(map: ArenaMap, team: Team, slot: number) {
  const home = map.flagHome[team];
  const ring = [[home.x, home.z], [home.x - 2.2, home.z + (team === "red" ? 1.1 : -1.1)], [home.x + 2.2, home.z + (team === "red" ? 1.1 : -1.1)], [home.x - 3.8, home.z], [home.x + 3.8, home.z], [home.x, home.z + (team === "red" ? 2 : -2)]];
  const p = ring[slot % ring.length]!;
  return { x: p[0]!, y: 0, z: p[1]!, yaw: team === "red" ? 0 : Math.PI };
}
export function inZone(x: number, z: number, zone: Zone) { return Math.hypot(x - zone.x, z - zone.z) < zone.r; }
export function inHill(map: ArenaMap, x: number, y: number, z: number) { return inZone(x, z, { id: "h", x: map.hill.x, z: map.hill.z, r: map.hill.r }) && y >= map.hill.y - 0.2; }
export function inOwnBase(map: ArenaMap, x: number, z: number, team: Team) { const h = map.flagHome[team]; return Math.hypot(x - h.x, z - h.z) < 4.2; }
