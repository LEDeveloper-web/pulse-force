import { useCallback, useEffect, useState } from "react";
import "./ui/screens.css";
import { startWeapon, type ShopTab } from "./game/weapons";
import { type GameMode, type HudState, type Team } from "./game/types";
import { BLUE_CHARS, RED_CHARS, payout, saveProfile, type Profile } from "./game/profile";
import type { MapId } from "./game/maps";
import { Hud, PlayView } from "./PlayBits";
import { go } from "./ui/path";
import { useRoute } from "./ui/useRoute";
import { loadSession, saveSession } from "./ui/session";
import { createRoom, loadRooms } from "./ui/lobby";
import {
  ArmoryPage,
  FriendsAdd,
  FriendsFind,
  FriendsHome,
  FriendsRequests,
  GameHub,
  MainMenu,
  MultiplayerCreate,
  MultiplayerHome,
  MultiplayerJoin,
  ServerCreate,
  ServerFind,
  ServerHome,
  ServerJoin,
  SettingsPage,
  SingleplayerCreate,
  SingleplayerHome,
  TeamPage,
} from "./ui/pages";

export function GameApp() {
  const route = useRoute();
  const boot = loadSession();
  const [profile, setProfile] = useState<Profile>(boot.profile);
  const [mode, setMode] = useState<GameMode>(boot.mode);
  const [mapId, setMapId] = useState<MapId>(boot.mapId);
  const [team, setTeam] = useState<Team>(boot.team);
  const [bots, setBots] = useState(boot.bots);
  const [hud, setHud] = useState<HudState | null>(null);
  const [matchId, setMatchId] = useState(0);
  const [buyOpen, setBuyOpen] = useState(false);
  const [shopTab, setShopTab] = useState<ShopTab>("pistol");
  const [shopMsg, setShopMsg] = useState("");
  const [roomName, setRoomName] = useState("Pulse Room");
  const [joinCode, setJoinCode] = useState("");
  const [note, setNote] = useState("");
  const [rooms, setRooms] = useState(() => loadRooms());

  useEffect(() => {
    saveProfile(profile);
    saveSession({ profile, mode, mapId, team, bots });
  }, [profile, mode, mapId, team, bots]);

  const patch = (partial: Partial<Profile>) => setProfile((p) => ({ ...p, ...partial }));
  const onTeam = (t: Team) => {
    setTeam(t);
    patch({ character: (t === "blue" ? BLUE_CHARS : RED_CHARS)[0]! });
  };
  const onMatchEnd = useCallback((w: string) => {
    setNote(`${w} wins`);
    go({ page: route.page === "multiplayer" ? "multiplayer" : route.page === "serverplayer" ? "serverplayer" : "singleplayer" });
  }, [route.page]);

  useEffect(() => {
    if (!hud || !note.endsWith("wins")) return;
    const pay = payout(Math.floor(hud.personal), !note.startsWith("Draw"));
    setProfile((p) => ({ ...p, credits: p.credits + pay.credits, xp: p.xp + pay.xp }));
  }, [note, hud]);

  const playing = route.action === "game" && (route.page === "singleplayer" || route.page === "multiplayer" || route.page === "serverplayer" || route.page === "game");

  const enterGame = (page: typeof route.page, server?: string) => {
    setBuyOpen(false);
    setMatchId((n) => n + 1);
    go({ page, action: "game", server, mode, map: mapId });
  };

  const joinByCode = (room?: { name: string; mode: GameMode; map: MapId }) => {
    const hit = room || rooms.find((r) => r.id.toLowerCase() === joinCode.trim().toLowerCase() || r.name.toLowerCase() === joinCode.trim().toLowerCase());
    if (!hit) { setNote("Not found"); return; }
    setMode(hit.mode); setMapId(hit.map); enterGame("serverplayer", hit.name);
  };

  if (playing) {
    return (
      <div className="shell play-only">
        <PlayView key={matchId} mode={mode} mapId={mapId} team={team} name={profile.name} primary={startWeapon(mode)} lookScale={profile.lookScale} invertY={profile.invertY} muted={profile.muted} startMoney={profile.startMoney} botCount={bots} onHud={setHud} onMatchEnd={onMatchEnd} />
        {hud && (
          <Hud hud={hud} muted={profile.muted} buyOpen={buyOpen} shopTab={shopTab} onShopTab={setShopTab}
            onBuy={(id) => setShopMsg(window.__pulseBuy?.(id) ? "Purchased" : "Not enough cash")}
            onToggleBuy={() => { setBuyOpen((v) => !v); window.__pulseArena?.toggleShop?.(); }}
            onMuted={(v) => patch({ muted: v })}
            onLeave={() => go({ page: route.page, action: "" })} />
        )}
        {shopMsg && <p className="toast">{shopMsg}</p>}
      </div>
    );
  }

  const setup = {
    mode, mapId, team, bots, character: profile.character,
    onMode: setMode, onMap: setMapId, onTeam, onBots: setBots, onCharacter: (c: string) => patch({ character: c }),
  };

  if (route.page === "game") return <GameHub />;
  if (route.page === "singleplayer" && route.action === "create") return <SingleplayerCreate {...setup} onStart={() => enterGame("singleplayer")} />;
  if (route.page === "singleplayer") return <SingleplayerHome />;
  if (route.page === "multiplayer" && route.action === "create") return (
    <MultiplayerCreate {...setup} roomName={roomName} setRoomName={setRoomName} onCreate={() => {
      const room = createRoom({ name: roomName, mode, map: mapId }); setRooms(loadRooms()); enterGame("multiplayer", room.name);
    }} />
  );
  if (route.page === "multiplayer" && route.action === "join") return (
    <MultiplayerJoin code={joinCode} setCode={setJoinCode} rooms={rooms} note={note} onJoin={(r) => joinByCode(r)} />
  );
  if (route.page === "multiplayer") return <MultiplayerHome />;
  if (route.page === "settings") return <SettingsPage profile={profile} patch={patch} />;
  if (route.page === "team") return <TeamPage team={team} character={profile.character} onTeam={onTeam} onCharacter={(c) => patch({ character: c })} />;
  if (route.page === "armory") return <ArmoryPage profile={profile} setProfile={setProfile} />;
  if (route.page === "serverplayer" && route.action === "create") return (
    <ServerCreate {...setup} roomName={roomName} setRoomName={setRoomName} onCreate={() => {
      const room = createRoom({ name: roomName, mode, map: mapId }); setRooms(loadRooms()); enterGame("serverplayer", room.name);
    }} />
  );
  if (route.page === "serverplayer" && route.action === "join") return (
    <ServerJoin code={joinCode} setCode={setJoinCode} rooms={rooms} note={note} onJoin={(r) => joinByCode(r)} />
  );
  if (route.page === "serverplayer" && (route.action === "find" || route.action === "filter" || route.action === "search")) {
    return <ServerFind route={route} rooms={rooms} onJoin={(r) => joinByCode(r)} />;
  }
  if (route.page === "serverplayer") return <ServerHome rooms={rooms} onJoin={(r) => joinByCode(r)} />;
  if (route.page === "friendlist" && route.action === "find") return <FriendsFind />;
  if (route.page === "friendlist" && route.action === "search") return <FriendsFind />;
  if (route.page === "friendlist" && route.action === "add") return <FriendsAdd />;
  if (route.page === "friendlist" && route.action === "request") return <FriendsRequests />;
  if (route.page === "friendlist") return <FriendsHome />;
  return <MainMenu name={profile.name} />;
}
