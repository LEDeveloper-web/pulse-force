import type { Team } from "./types";

export type Solid = {
  minx: number;
  miny: number;
  minz: number;
  maxx: number;
  maxy: number;
  maxz: number;
  kind: "wall" | "crate" | "hill" | "base" | "trim";
  team?: Team;
};

export type MapId = "hall" | "warehouse" | "yard" | "docks" | "compound";

export type Zone = { id: string; x: number; z: number; r: number };

export type ArenaMap = {
  id: MapId;
  name: string;
  code: string;
  blurb: string;
  size: number;
  bg: number;
  fogFar: number;
  floor: number;
  solids: Solid[];
  flagHome: Record<Team, { x: number; y: number; z: number }>;
  hill: { x: number; y: number; z: number; r: number };
  points: Zone[];
  hardpoints: Zone[];
};

function solid(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  kind: Solid["kind"],
  team?: Team,
): Solid {
  return {
    minx: x - w / 2,
    miny: y,
    minz: z - d / 2,
    maxx: x + w / 2,
    maxy: y + h,
    maxz: z + d / 2,
    kind,
    team,
  };
}

function perimeter(size: number, h = 6): Solid[] {
  return [
    solid(0, 0, -size - 0.7, size * 2 + 2.8, h, 1.4, "wall"),
    solid(0, 0, size + 0.7, size * 2 + 2.8, h, 1.4, "wall"),
    solid(-size - 0.7, 0, 0, 1.4, h, size * 2, "wall"),
    solid(size + 0.7, 0, 0, 1.4, h, size * 2, "wall"),
  ];
}

const HALL: ArenaMap = {
  id: "hall",
  name: "Pulse Hall",
  code: "PH-01",
  blurb: "Indoor arena with a raised mid pad. Classic mid-fight.",
  size: 22,
  bg: 0x0c0d11,
  fogFar: 58,
  floor: 0xc8c8d0,
  flagHome: { red: { x: 0, y: 0, z: -18.4 }, blue: { x: 0, y: 0, z: 18.4 } },
  hill: { x: 0, y: 1.22, z: 0, r: 4.4 },
  points: [
    { id: "A", x: 0, z: 0, r: 3.4 },
    { id: "B", x: -12, z: -8, r: 2.8 },
    { id: "C", x: 12, z: 8, r: 2.8 },
  ],
  hardpoints: [
    { id: "MID", x: 0, z: 0, r: 4 },
    { id: "RED", x: 0, z: -12, r: 3.2 },
    { id: "BLUE", x: 0, z: 12, r: 3.2 },
  ],
  solids: [
    ...perimeter(22),
    solid(-9.5, 0, 0, 1.2, 2.3, 7.5, "wall"),
    solid(9.5, 0, 0, 1.2, 2.3, 7.5, "wall"),
    solid(0, 0, -8.5, 6.5, 1.15, 1.15, "crate"),
    solid(0, 0, 8.5, 6.5, 1.15, 1.15, "crate"),
    solid(0, 0, 0, 9.2, 1.22, 9.2, "hill"),
    solid(0, 0, -6.4, 3.6, 0.4, 2.2, "hill"),
    solid(0, 0, 6.4, 3.6, 0.4, 2.2, "hill"),
    solid(-16, 0, -10, 1.1, 3.2, 8, "wall"),
    solid(16, 0, 10, 1.1, 3.2, 8, "wall"),
    solid(-16, 0, 10, 1.1, 3.2, 8, "wall"),
    solid(16, 0, -10, 1.1, 3.2, 8, "wall"),
    solid(-6, 0, -14, 2.2, 1.1, 2.2, "crate"),
    solid(6, 0, -14, 2.2, 1.1, 2.2, "crate"),
    solid(-6, 0, 14, 2.2, 1.1, 2.2, "crate"),
    solid(6, 0, 14, 2.2, 1.1, 2.2, "crate"),
    solid(-13, 0, -4, 1.8, 1.6, 1.8, "crate"),
    solid(13, 0, 4, 1.8, 1.6, 1.8, "crate"),
    solid(-4.5, 0, -19.2, 1.4, 2.8, 1.4, "base", "red"),
    solid(4.5, 0, -19.2, 1.4, 2.8, 1.4, "base", "red"),
    solid(-4.5, 0, 19.2, 1.4, 2.8, 1.4, "base", "blue"),
    solid(4.5, 0, 19.2, 1.4, 2.8, 1.4, "base", "blue"),
  ],
};

const WAREHOUSE: ArenaMap = {
  id: "warehouse",
  name: "Freight Yard",
  code: "WH-07",
  blurb: "Long sightlines and stacked crates. Snipers love the rails.",
  size: 24,
  bg: 0x12100c,
  fogFar: 64,
  floor: 0xb8b0a0,
  flagHome: { red: { x: -16, y: 0, z: -20 }, blue: { x: 16, y: 0, z: 20 } },
  hill: { x: 0, y: 0, z: 0, r: 3.6 },
  points: [
    { id: "A", x: -10, z: -10, r: 3 },
    { id: "B", x: 0, z: 0, r: 3.2 },
    { id: "C", x: 10, z: 10, r: 3 },
  ],
  hardpoints: [
    { id: "MID", x: 0, z: 0, r: 3.4 },
    { id: "WEST", x: -14, z: 0, r: 3 },
    { id: "EAST", x: 14, z: 0, r: 3 },
  ],
  solids: [
    ...perimeter(24),
    solid(-8, 0, -6, 3.2, 2.4, 8, "crate"),
    solid(8, 0, 6, 3.2, 2.4, 8, "crate"),
    solid(-14, 0, 8, 4, 1.4, 3, "crate"),
    solid(14, 0, -8, 4, 1.4, 3, "crate"),
    solid(0, 0, -12, 1.2, 3.6, 10, "wall"),
    solid(0, 0, 12, 1.2, 3.6, 10, "wall"),
    solid(-18, 0, 0, 2.4, 1.8, 6, "crate"),
    solid(18, 0, 0, 2.4, 1.8, 6, "crate"),
    solid(-6, 0, 16, 5, 1.1, 2, "crate"),
    solid(6, 0, -16, 5, 1.1, 2, "crate"),
    solid(-20, 0, -20, 2, 3, 2, "base", "red"),
    solid(20, 0, 20, 2, 3, 2, "base", "blue"),
  ],
};

const YARD: ArenaMap = {
  id: "yard",
  name: "Courtyard",
  code: "CY-12",
  blurb: "Open plaza with a ring wall. Fast rotates, messy mid.",
  size: 20,
  bg: 0x10140f,
  fogFar: 52,
  floor: 0x9aaa90,
  flagHome: { red: { x: 0, y: 0, z: -17 }, blue: { x: 0, y: 0, z: 17 } },
  hill: { x: 0, y: 0.6, z: 0, r: 3.8 },
  points: [
    { id: "A", x: -8, z: 0, r: 2.6 },
    { id: "B", x: 0, z: 0, r: 3 },
    { id: "C", x: 8, z: 0, r: 2.6 },
  ],
  hardpoints: [
    { id: "MID", x: 0, z: 0, r: 3.6 },
    { id: "N", x: 0, z: -10, r: 2.8 },
    { id: "S", x: 0, z: 10, r: 2.8 },
  ],
  solids: [
    ...perimeter(20),
    solid(0, 0, 0, 6.5, 0.6, 6.5, "hill"),
    solid(-7, 0, -7, 1.4, 2.2, 1.4, "wall"),
    solid(7, 0, -7, 1.4, 2.2, 1.4, "wall"),
    solid(-7, 0, 7, 1.4, 2.2, 1.4, "wall"),
    solid(7, 0, 7, 1.4, 2.2, 1.4, "wall"),
    solid(-12, 0, 0, 4, 1.2, 1.6, "crate"),
    solid(12, 0, 0, 4, 1.2, 1.6, "crate"),
    solid(0, 0, -12, 1.6, 1.2, 4, "crate"),
    solid(0, 0, 12, 1.6, 1.2, 4, "crate"),
    solid(-4, 0, -17.4, 1.3, 2.6, 1.3, "base", "red"),
    solid(4, 0, -17.4, 1.3, 2.6, 1.3, "base", "red"),
    solid(-4, 0, 17.4, 1.3, 2.6, 1.3, "base", "blue"),
    solid(4, 0, 17.4, 1.3, 2.6, 1.3, "base", "blue"),
  ],
};

const DOCKS: ArenaMap = {
  id: "docks",
  name: "Night Docks",
  code: "DK-04",
  blurb: "Two piers and a crane lane. Flank the water edge.",
  size: 23,
  bg: 0x0a1016,
  fogFar: 60,
  floor: 0x8a9aaa,
  flagHome: { red: { x: -18, y: 0, z: -18 }, blue: { x: 18, y: 0, z: 18 } },
  hill: { x: 0, y: 0, z: 0, r: 3.2 },
  points: [
    { id: "A", x: -12, z: -12, r: 2.8 },
    { id: "B", x: 0, z: 0, r: 3 },
    { id: "C", x: 12, z: 12, r: 2.8 },
  ],
  hardpoints: [
    { id: "CRANE", x: 0, z: 0, r: 3.2 },
    { id: "WEST", x: -14, z: -4, r: 2.8 },
    { id: "EAST", x: 14, z: 4, r: 2.8 },
  ],
  solids: [
    ...perimeter(23),
    solid(-10, 0, 0, 2.2, 2.8, 16, "wall"),
    solid(10, 0, 0, 2.2, 2.8, 16, "wall"),
    solid(0, 0, -8, 6, 1.3, 2.2, "crate"),
    solid(0, 0, 8, 6, 1.3, 2.2, "crate"),
    solid(-16, 0, 10, 3, 1.6, 3, "crate"),
    solid(16, 0, -10, 3, 1.6, 3, "crate"),
    solid(0, 0, 0, 3.4, 0.4, 3.4, "hill"),
    solid(-18, 0, -18, 2, 2.8, 2, "base", "red"),
    solid(18, 0, 18, 2, 2.8, 2, "base", "blue"),
  ],
};

const COMPOUND: ArenaMap = {
  id: "compound",
  name: "Compound",
  code: "CP-19",
  blurb: "Tight rooms and choke doors. Shotguns and SMGs rule.",
  size: 18,
  bg: 0x12100e,
  fogFar: 46,
  floor: 0xb0a898,
  flagHome: { red: { x: 0, y: 0, z: -15.4 }, blue: { x: 0, y: 0, z: 15.4 } },
  hill: { x: 0, y: 0, z: 0, r: 2.8 },
  points: [
    { id: "A", x: -8, z: -6, r: 2.2 },
    { id: "B", x: 0, z: 0, r: 2.4 },
    { id: "C", x: 8, z: 6, r: 2.2 },
  ],
  hardpoints: [
    { id: "CORE", x: 0, z: 0, r: 2.6 },
    { id: "W", x: -8, z: 0, r: 2.2 },
    { id: "E", x: 8, z: 0, r: 2.2 },
  ],
  solids: [
    ...perimeter(18),
    solid(-6, 0, -4, 8, 3.2, 1.1, "wall"),
    solid(6, 0, 4, 8, 3.2, 1.1, "wall"),
    solid(-4, 0, 6, 1.1, 3.2, 7, "wall"),
    solid(4, 0, -6, 1.1, 3.2, 7, "wall"),
    solid(-10, 0, 8, 2, 1.4, 2, "crate"),
    solid(10, 0, -8, 2, 1.4, 2, "crate"),
    solid(0, 0, 0, 3.2, 0.5, 3.2, "hill"),
    solid(-3, 0, -15.6, 1.2, 2.4, 1.2, "base", "red"),
    solid(3, 0, -15.6, 1.2, 2.4, 1.2, "base", "red"),
    solid(-3, 0, 15.6, 1.2, 2.4, 1.2, "base", "blue"),
    solid(3, 0, 15.6, 1.2, 2.4, 1.2, "base", "blue"),
  ],
};

export const MAP_LIST: ArenaMap[] = [HALL, WAREHOUSE, YARD, DOCKS, COMPOUND];

export const MAPS: Record<MapId, ArenaMap> = {
  hall: HALL,
  warehouse: WAREHOUSE,
  yard: YARD,
  docks: DOCKS,
  compound: COMPOUND,
};

export function getMap(id: string | undefined): ArenaMap {
  return MAPS[(id as MapId) in MAPS ? (id as MapId) : "hall"];
}

export function spawnPoint(map: ArenaMap, team: Team, slot: number) {
  const home = map.flagHome[team];
  const ring = [
    [home.x, home.z],
    [home.x - 2.2, home.z + (team === "red" ? 1.1 : -1.1)],
    [home.x + 2.2, home.z + (team === "red" ? 1.1 : -1.1)],
    [home.x - 3.8, home.z],
    [home.x + 3.8, home.z],
    [home.x, home.z + (team === "red" ? 2 : -2)],
  ];
  const p = ring[slot % ring.length]!;
  return { x: p[0]!, y: 0, z: p[1]!, yaw: team === "red" ? 0 : Math.PI };
}

export function inZone(x: number, z: number, zone: Zone) {
  return Math.hypot(x - zone.x, z - zone.z) < zone.r;
}

export function inHill(map: ArenaMap, x: number, y: number, z: number) {
  return inZone(x, z, { id: "h", x: map.hill.x, z: map.hill.z, r: map.hill.r }) && y >= map.hill.y - 0.2;
}

export function inOwnBase(map: ArenaMap, x: number, z: number, team: Team) {
  const h = map.flagHome[team];
  return Math.hypot(x - h.x, z - h.z) < 4.2;
}
