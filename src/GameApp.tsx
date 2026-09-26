import { useCallback, useEffect, useRef, useState } from "react";
import "./ui/screens.css";
import { startWeapon, type ShopTab } from "./game/weapons";
import { type GameMode, type HudState, type Team } from "./game/types";
import { BLUE_CHARS, RED_CHARS, payout, saveProfile, type Profile } from "./game/profile";
import type { MapId } from "./game/maps";
import { Hud, PlayView } from "./PlayBits";
import { go } from "./ui/path";
import { useRoute } from "./ui/useRoute";
import { loadSession, saveSession } from "./ui/session";
import { createRoom, loadRooms, type ServerRoom } from "./ui/lobby";
import { currentAccount, renameAccount, signOut, type Account } from "./ui/account";
import {
  clearParty,
  hostParty,
  joinParty,
  loadParty,
  openPartyBus,
  saveParty,
  type Party,
} from "./ui/net";
import {
  AccountChip,
  AuthModal,
  PauseMenu,
  PickOperator,
  ResultsCard,
  VoteMap,
} from "./ui/flow";
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

type Phase = "menus" | "play" | "results" | "vote" | "pick";

export function GameApp() {
  const route = useRoute();
  const boot = loadSession();
  const [account, setAccount] = useState<Account | null>(() => currentAccount());
  const [authOpen, setAuthOpen] = useState(false);
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
  const [country, setCountry] = useState("INT");
  const [note, setNote] = useState("");
  const [rooms, setRooms] = useState(() => loadRooms());
  const [phase, setPhase] = useState<Phase>("menus");
  const [winner, setWinner] = useState("");
  const [party, setParty] = useState<Party>(() => loadParty());
  const [menuOpen, setMenuOpen] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState(false);
  const busRef = useRef<ReturnType<typeof openPartyBus> | null>(null);

  useEffect(() => {
    saveProfile(profile);
    saveSession({ profile, mode, mapId, team, bots });
  }, [profile, mode, mapId, team, bots]);

  useEffect(() => {
    if (route.action === "game" && phase === "menus" && (route.page === "singleplayer" || route.page === "multiplayer" || route.page === "serverplayer" || route.page === "game")) {
      if (route.page === "singleplayer") {
        setParty({ role: "solo", code: "", ip: "", kind: "local", country: "INT" });
      }
      setPhase("play");
      setMatchId((n) => n + 1);
    }
  }, [route.action, route.page]);

  useEffect(() => {
    if (account?.name && profile.name === "Ranger-01") {
      setProfile((p) => ({ ...p, name: account.name }));
    }
  }, [account, profile.name]);

  useEffect(() => {
    busRef.current?.close();
    if (party.role === "solo") {
      busRef.current = null;
      return;
    }
    const bus = openPartyBus(party, (ev) => {
      if (ev.t === "bye" && party.role === "member") {
        leaveAll("Host left");
      } else if (ev.t === "end") {
        setWinner(ev.winner);
        setPhase("results");
      } else if (ev.t === "vote") {
        setVotes((v) => ({ ...v, [ev.name]: ev.map }));
      } else if (ev.t === "phase") {
        if (ev.map) setMapId(ev.map as MapId);
        if (ev.phase === "vote") setPhase("vote");
        if (ev.phase === "pick") setPhase("pick");
        if (ev.phase === "play" && ev.match) {
          setMatchId(ev.match);
          setBuyOpen(false);
          setMenuOpen(false);
          setWinner("");
          setPhase("play");
        }
      } else if (ev.t === "start") {
        setMapId(ev.map as MapId);
        setMatchId(ev.match);
        setBuyOpen(false);
        setMenuOpen(false);
        setWinner("");
        setPhase("play");
        go({ page: party.kind === "online" ? "serverplayer" : "multiplayer", action: "game", server: party.ip || party.code, mode, map: ev.map });
      }
    });
    busRef.current = bus;
    bus.send({ t: "hello", name: profile.name, party });
    return () => bus.close();
  }, [party.code, party.ip, party.role]);

  const patch = (partial: Partial<Profile>) => {
    setProfile((p) => {
      const next = { ...p, ...partial };
      if (partial.name !== undefined) renameAccount(partial.name);
      return next;
    });
  };

  const onTeam = (t: Team) => {
    setTeam(t);
    patch({ character: (t === "blue" ? BLUE_CHARS : RED_CHARS)[0]! });
  };

  const applyAccount = (a: Account) => {
    setAccount(a);
    setProfile((p) => ({ ...p, name: a.name || p.name }));
    setAuthOpen(false);
  };

  const doSignOut = () => {
    signOut();
    setAccount(null);
  };

  const leaveAll = (msg = "") => {
    if (party.role === "host") busRef.current?.send({ t: "bye", reason: "host-exit" });
    busRef.current?.close();
    busRef.current = null;
    clearParty();
    setParty({ role: "solo", code: "", ip: "", kind: "local", country: "INT" });
    setPhase("menus");
    setMenuOpen(false);
    setBuyOpen(false);
    setWinner("");
    setVotes({});
    setHud(null);
    setPaid(false);
    if (msg) setNote(msg);
    go({ page: "main" });
  };

  const onMatchEnd = useCallback((w: string) => {
    setWinner(`${w}${w.toLowerCase().includes("win") || w === "Draw" ? "" : " wins"}`);
    setPhase("results");
    setMenuOpen(false);
    if (party.role === "host") busRef.current?.send({ t: "end", winner: w });
  }, [party.role]);

  useEffect(() => {
    if (phase === "play" && hud?.paused) setMenuOpen(true);
  }, [hud?.paused, phase]);

  useEffect(() => {
    if (phase !== "results" || !hud || paid) return;
    const won = !!winner && !winner.startsWith("Draw");
    const pay = payout(Math.floor(hud.personal), won);
    setPaid(true);
    setProfile((p) => ({ ...p, credits: p.credits + pay.credits, xp: p.xp + pay.xp }));
  }, [phase, hud, winner, paid]);

  const startMatch = (page: "singleplayer" | "multiplayer" | "serverplayer", server?: string) => {
    setBuyOpen(false);
    setMenuOpen(false);
    setPaid(false);
    setWinner("");
    setVotes({});
    setMatchId((n) => n + 1);
    setPhase("play");
    go({ page, action: "game", server, mode, map: mapId });
  };

  const makeHost = async (kind: "local" | "online") => {
    const p = await hostParty(kind, country);
    setParty(p);
    const room = createRoom({ name: roomName, mode, map: mapId, kind, country, ip: p.ip });
    setRooms(loadRooms());
    startMatch(kind === "online" ? "serverplayer" : "multiplayer", room.ip || room.id);
  };

  const joinHost = (raw?: string, room?: ServerRoom, kind: "local" | "online" = "local") => {
    const token = (raw ?? joinCode).trim();
    const hit = room || rooms.find((r) =>
      r.id.toLowerCase() === token.toLowerCase()
      || r.name.toLowerCase() === token.toLowerCase()
      || (r.ip && r.ip === token)
    );
    if (!token && !hit) { setNote("Enter the host IP"); return; }
    if (hit) {
      setMode(hit.mode);
      setMapId(hit.map);
    }
    const p = joinParty(hit?.ip || hit?.id || token, hit?.kind || kind);
    if (!p) { setNote("Need a host IP"); return; }
    setParty(p);
    startMatch((hit?.kind || kind) === "online" ? "serverplayer" : "multiplayer", p.ip || p.code);
  };

  const playAgain = () => {
    if (party.role === "solo") {
      startMatch("singleplayer");
      return;
    }
    setPhase("vote");
    setVotes((v) => ({ ...v, [profile.name]: mapId }));
    busRef.current?.send({ t: "vote", name: profile.name, map: mapId });
    if (party.role === "host") busRef.current?.send({ t: "phase", phase: "vote", map: mapId });
  };

  const lockVote = () => {
    busRef.current?.send({ t: "vote", name: profile.name, map: mapId });
    const tally = { ...votes, [profile.name]: mapId };
    const counts: Record<string, number> = {};
    Object.values(tally).forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as MapId | undefined;
    if (best) setMapId(best);
    setPhase("pick");
    if (party.role === "host") busRef.current?.send({ t: "phase", phase: "pick", map: best || mapId });
  };

  const startNextFromPick = () => {
    busRef.current?.send({ t: "pick-ready", name: profile.name });
    if (party.role === "member") {
      setNote("Waiting for host to start");
      return;
    }
    const next = matchId + 1;
    busRef.current?.send({ t: "start", map: mapId, match: next });
    startMatch(party.kind === "online" ? "serverplayer" : "multiplayer", party.ip || party.code);
  };

  const playing = phase === "play" || phase === "results";
  const inArena = playing && (route.action === "game" || phase === "results");

  if (phase === "vote") {
    return (
      <VoteMap
        mapId={mapId}
        votes={votes}
        locked={party.role === "member"}
        onPick={(id) => {
          setMapId(id);
          setVotes((v) => ({ ...v, [profile.name]: id }));
          busRef.current?.send({ t: "vote", name: profile.name, map: id });
        }}
        onNext={lockVote}
      />
    );
  }

  if (phase === "pick") {
    return (
      <PickOperator
        team={team}
        character={profile.character}
        onTeam={onTeam}
        onCharacter={(c) => patch({ character: c })}
        waiting={party.role === "member"}
        onStart={startNextFromPick}
      />
    );
  }

  if (inArena) {
    return (
      <div className="shell play-only">
        <PlayView
          key={matchId}
          mode={mode}
          mapId={mapId}
          team={team}
          name={profile.name}
          primary={startWeapon(mode)}
          lookScale={profile.lookScale}
          invertY={profile.invertY}
          muted={profile.muted}
          startMoney={profile.startMoney}
          botCount={bots}
          onHud={setHud}
          onMatchEnd={onMatchEnd}
        />
        {hud && phase === "play" && (
          <Hud
            hud={hud}
            muted={profile.muted}
            buyOpen={buyOpen}
            shopTab={shopTab}
            onShopTab={setShopTab}
            onBuy={(id) => setShopMsg(window.__pulseBuy?.(id) ? "Purchased" : "Not enough cash")}
            onToggleBuy={() => { setBuyOpen((v) => !v); window.__pulseArena?.toggleShop?.(); }}
            onMuted={(v) => patch({ muted: v })}
            onMenu={() => { setMenuOpen(true); window.__pulseArena?.setPaused?.(true); }}
            onLeave={() => leaveAll()}
          />
        )}
        {shopMsg && <p className="toast">{shopMsg}</p>}
        {phase === "play" && menuOpen && (
          <PauseMenu
            party={party}
            onResume={() => { setMenuOpen(false); window.__pulseArena?.setPaused?.(false); }}
            onExit={() => leaveAll()}
          />
        )}
        {phase === "results" && (
          <ResultsCard
            winner={winner || "Match over"}
            hud={hud}
            kind={party.role}
            onMain={() => leaveAll()}
            onPlayAgain={playAgain}
            onLeave={() => leaveAll()}
          />
        )}
      </div>
    );
  }

  const setup = {
    mode, mapId, team, bots, character: profile.character,
    onMode: setMode, onMap: setMapId, onTeam, onBots: setBots, onCharacter: (c: string) => patch({ character: c }),
  };

  if (route.page === "game") return <GameHub />;
  if (route.page === "singleplayer" && route.action === "create") {
    return <SingleplayerCreate {...setup} onStart={() => {
      setParty({ role: "solo", code: "", ip: "", kind: "local", country: "INT" });
      saveParty({ role: "solo", code: "", ip: "", kind: "local", country: "INT" });
      startMatch("singleplayer");
    }} />;
  }
  if (route.page === "singleplayer") return <SingleplayerHome />;
  if (route.page === "multiplayer" && route.action === "create") {
    return (
      <MultiplayerCreate {...setup} roomName={roomName} setRoomName={setRoomName} hostIp={party.role === "host" ? party.ip : ""} onCreate={() => { void makeHost("local"); }} />
    );
  }
  if (route.page === "multiplayer" && route.action === "join") {
    return (
      <MultiplayerJoin
        code={joinCode}
        setCode={setJoinCode}
        rooms={rooms.filter((r) => r.kind === "local")}
        note={note}
        onJoin={(r) => joinHost(joinCode, r, "local")}
      />
    );
  }
  if (route.page === "multiplayer") return <MultiplayerHome />;
  if (route.page === "settings") {
    return (
      <SettingsPage
        profile={profile}
        account={account}
        patch={patch}
      />
    );
  }
  if (route.page === "team") return <TeamPage team={team} character={profile.character} onTeam={onTeam} onCharacter={(c) => patch({ character: c })} />;
  if (route.page === "armory") return <ArmoryPage profile={profile} setProfile={setProfile} />;
  if (route.page === "serverplayer" && route.action === "create") {
    return (
      <ServerCreate
        {...setup}
        roomName={roomName}
        setRoomName={setRoomName}
        country={country}
        setCountry={setCountry}
        onCreate={() => { void makeHost("online"); }}
      />
    );
  }
  if (route.page === "serverplayer" && route.action === "join") {
    return (
      <ServerJoin
        code={joinCode}
        setCode={setJoinCode}
        rooms={rooms.filter((r) => r.kind === "online")}
        note={note}
        onJoin={(r) => joinHost(joinCode, r, "online")}
      />
    );
  }
  if (route.page === "serverplayer" && (route.action === "find" || route.action === "filter" || route.action === "search")) {
    return (
      <ServerFind
        route={route}
        rooms={rooms.filter((r) => r.kind === "online")}
        onJoin={(r) => joinHost(r.ip || r.id, r, "online")}
      />
    );
  }
  if (route.page === "serverplayer") {
    return (
      <ServerHome
        rooms={rooms.filter((r) => r.kind === "online")}
        onJoin={(r) => joinHost(r.ip || r.id, r, "online")}
      />
    );
  }
  if (route.page === "friendlist" && route.action === "find") return <FriendsFind />;
  if (route.page === "friendlist" && route.action === "search") return <FriendsFind />;
  if (route.page === "friendlist" && route.action === "add") return <FriendsAdd />;
  if (route.page === "friendlist" && route.action === "request") return <FriendsRequests />;
  if (route.page === "friendlist") return <FriendsHome />;
  return (
    <>
      <MainMenu name={profile.name} account={account} onAuth={() => setAuthOpen(true)} onSignOut={doSignOut} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onOk={applyAccount} />}
    </>
  );
}
