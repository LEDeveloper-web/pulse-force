import { BLUE_CHARS, loadProfile, saveProfile, type Profile } from "../game/profile";
import { type GameMode, type Team } from "../game/types";
import { type MapId } from "../game/maps";

export type Session = {
  profile: Profile;
  mode: GameMode;
  mapId: MapId;
  team: Team;
  bots: number;
};

const KEY = "pulse-force-session-v1";

export function loadSession(): Session {
  const profile = loadProfile();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Session>;
    return {
      profile,
      mode: (raw.mode as GameMode) || "classic",
      mapId: (raw.mapId as MapId) || "room",
      team: raw.team === "red" ? "red" : "blue",
      bots: Math.max(2, Math.min(9, Number(raw.bots) || 7)),
    };
  } catch {
    return { profile, mode: "classic", mapId: "room", team: "blue", bots: 7 };
  }
}

export function saveSession(s: Session) {
  saveProfile(s.profile);
  localStorage.setItem(KEY, JSON.stringify({ mode: s.mode, mapId: s.mapId, team: s.team, bots: s.bots }));
}

export function patchProfile(partial: Partial<Profile>): Profile {
  const s = loadSession();
  s.profile = { ...s.profile, ...partial };
  if (!s.profile.character) s.profile.character = BLUE_CHARS[0]!;
  saveSession(s);
  return s.profile;
}
