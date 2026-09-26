import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BOMB_MAPS, MAP_LIST, type MapId } from "./game/maps";
import { WEAPONS, startWeapon, type ShopTab, type WeaponId } from "./game/weapons";
import { MODE_BLURB, MODE_LABEL, type GameMode, type HudState, type Team } from "./game/types";
import { BLUE_CHARS, RED_CHARS, loadProfile, payout, rankFor, saveProfile, type Profile } from "./game/profile";
import { Hud, PlayView } from "./PlayBits";
import { LINKS, go, type Route, type UiAction, type UiPage } from "./ui/path";
import { useRoute } from "./ui/useRoute";
import {
  DIRECTORY,
  createRoom,
  filterRooms,
  loadFriends,
  loadRequests,
  loadRooms,
  saveFriends,
  saveRequests,
  type Friend,
  type FriendRequest,
  type ServerRoom,
} from "./ui/lobby";

const MODES: GameMode[] = [
  "classic", "resurrection", "ctf", "zombie", "bomb", "knives", "deathmatch", "armsrace", "sniper",
];
const NAMES = ["Ranger", "Scout", "Vesper", "Comet", "Quill", "Harbor", "Nimbus", "Atlas"];
function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function randomName() { return `${NAMES[Math.floor(Math.random() * NAMES.length)]}-${Math.floor(10 + Math.random() * 89)}`; }

function titleFor(route: Route) {
  if (route.page === "singleplayer" && route.action === "create") return "CREATE MATCH";
  if (route.page === "singleplayer" && route.action === "game") return "SOLO MATCH";
  if (route.page === "multiplayer" && route.action === "create") return "CREATE ROOM";
  if (route.page === "multiplayer" && route.action === "join") return "JOIN ROOM";
  if (route.page === "multiplayer" && route.action === "game") return "MULTIPLAYER";
  if (route.page === "serverplayer" && route.action === "create") return "CREATE SERVER";
  if (route.page === "serverplayer" && route.action === "join") return "JOIN SERVER";
  if (route.page === "serverplayer" && route.action === "find") return "FIND SERVERS";
  if (route.page === "serverplayer" && route.action === "filter") return "FILTER";
  if (route.page === "serverplayer" && route.action === "search") return "SEARCH";
  if (route.page === "serverplayer" && route.action === "game") return (route.server || "SERVER").toUpperCase();
  if (route.page === "friendlist" && route.action === "find") return "FIND FRIENDS";
  if (route.page === "friendlist" && route.action === "search") return "SEARCH FRIENDS";
  if (route.page === "friendlist" && route.action === "add") return "ADD FRIEND";
  if (route.page === "friendlist" && route.action === "request") return "REQUESTS";
  const labels: Record<UiPage, string> = {
    main: "PULSE FORCE", game: "GAME", singleplayer: "SINGLEPLAYER", multiplayer: "MULTIPLAYER",
    settings: "SETTINGS", team: "TEAM", serverplayer: "SERVERS", friendlist: "FRIENDS", armory: "ARMORY",
  };
  return labels[route.page];
}

function Frame(props: { route: Route; profile: Profile; onBack?: () => void; children: ReactNode }) {
  const rank = rankFor(props.profile.xp);
  return (
    <div className="hq">
      <header className="topbar">
        <div>
          <p className="kicker">/ui/{props.route.page}{props.route.action ? `/${props.route.action}` : ""}</p>
          <h1>{titleFor(props.route)}</h1>
        </div>
        <div className="stats">
          <div><span>Credits</span><b>{props.profile.credits}</b></div>
          <div><span>{rank.current.name}</span><b>XP {props.profile.xp}</b></div>
        </div>
      </header>
      <div className="xpbar"><i style={{ width: `${Math.round(rank.pct * 100)}%` }} /></div>
      {props.onBack && <button className="ghost slim" onClick={props.onBack}>Back</button>}
      <section className="pane">{props.children}</section>
      <nav className="tabs five">
        <button className={cn(props.route.page === "main" && "on")} onClick={() => go({ page: "main" })}>Main</button>
        <button className={cn(props.route.page === "game" && "on")} onClick={() => go({ page: "game" })}>Game</button>
        <button className={cn(props.route.page === "serverplayer" && "on")} onClick={() => go({ page: "serverplayer" })}>Servers</button>
        <button className={cn(props.route.page === "friendlist" && "on")} onClick={() => go({ page: "friendlist" })}>Friends</button>
        <button className={cn(props.route.page === "settings" && "on")} onClick={() => go({ page: "settings" })}>Settings</button>
      </nav>
    </div>
  );
}

export function GameApp() {
  const route = useRoute();
  const [mode, setMode] = useState<GameMode>("classic");
  const [mapId, setMapId] = useState<MapId>("room");
  const [team, setTeam] = useState<Team>("blue");
  const [bots, setBots] = useState(7);
  const [shopTab, setShopTab] = useState<ShopTab>("pistol");
  const [profile, setProfile] = useState<Profile>(() => {
    const p = typeof window === "undefined" ? null : loadProfile();
    if (!p) return { name: randomName(), credits: 800, xp: 0, owned: ["knife", "pm"], primary: "pm", secondary: "knife", lookScale: 1.2, invertY: false, muted: false, startMoney: 800, character: "Alpha", autoFire: false };
    if (p.name === "Ranger-01") p.name = randomName();
    return p;
  });
  const [hud, setHud] = useState<HudState | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [reward, setReward] = useState<{ credits: number; xp: number } | null>(null);
  const [matchId, setMatchId] = useState(0);
  const [shopMsg, setShopMsg] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);
  const [rooms, setRooms] = useState<ServerRoom[]>(() => (typeof window === "undefined" ? [] : loadRooms()));
  const [friends, setFriends] = useState<Friend[]>(() => (typeof window === "undefined" ? [] : loadFriends()));
  const [requests, setRequests] = useState<FriendRequest[]>(() => (typeof window === "undefined" ? [] : loadRequests()));
  const [roomName, setRoomName] = useState("Pulse Room");
  const [joinCode, setJoinCode] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [addName, setAddName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveFriends(friends); }, [friends]);
  useEffect(() => { saveRequests(requests); }, [requests]);
  const patch = (partial: Partial<Profile>) => setProfile((p) => ({ ...p, ...partial }));
  useEffect(() => {
    if (mode === "bomb" && !BOMB_MAPS.includes(mapId)) setMapId((BOMB_MAPS[0] as MapId) || "desert3");
  }, [mode, mapId]);
  useEffect(() => {
    if (route.mode && MODES.includes(route.mode as GameMode)) setMode(route.mode as GameMode);
    if (route.map && MAP_LIST.some((m) => m.id === route.map)) setMapId(route.map as MapId);
    if (route.q && route.page === "friendlist") setFriendQuery(route.q);
  }, [route.mode, route.map, route.q, route.page]);

  const playing = (route.page === "singleplayer" && route.action === "game")
    || (route.page === "multiplayer" && route.action === "game")
    || (route.page === "serverplayer" && route.action === "game")
    || (route.page === "game" && route.action === "game");

  const startMatch = (target: Partial<Route> = { page: "singleplayer", action: "game" }) => {
    setWinner(null); setReward(null); setBuyOpen(false); setMatchId((n) => n + 1);
    go({ page: target.page || "singleplayer", action: "game", server: target.server || route.server, mode, map: mapId });
  };

  const onMatchEnd = useCallback((w: string) => {
    setWinner(w);
    go({ page: route.page === "serverplayer" ? "serverplayer" : route.page === "multiplayer" ? "multiplayer" : "singleplayer", action: "", server: route.server });
    setNotice(`${w} wins`);
  }, [route.page, route.server]);

  useEffect(() => {
    if (!playing || !winner || !hud || reward) return;
    const pay = payout(Math.floor(hud.personal), winner !== "Draw");
    setReward(pay);
    setProfile((p) => ({ ...p, credits: p.credits + pay.credits, xp: p.xp + pay.xp }));
  }, [playing, hud, reward, winner]);

  const chars = team === "blue" ? BLUE_CHARS : RED_CHARS;
  const maps = mode === "bomb" ? MAP_LIST.filter((m) => m.bombOk) : MAP_LIST;
  const visibleRooms = useMemo(
    () => filterRooms(rooms, { q: route.q, filter: route.filter, mode: route.mode, map: route.map }),
    [rooms, route.q, route.filter, route.mode, route.map],
  );

  const launchRoom = (room: ServerRoom) => {
    setMode(room.mode); setMapId(room.map); setMatchId((n) => n + 1); setWinner(null); setReward(null);
    go({ page: "serverplayer", action: "game", server: room.name, mode: room.mode, map: room.map });
  };

  const acceptRequest = (req: FriendRequest) => {
    setRequests((list) => list.filter((r) => r.id !== req.id));
    if (!friends.some((f) => f.name === req.name)) {
      setFriends((list) => [...list, { id: req.id, name: req.name, status: "online", team: "blue" }]);
    }
    setNotice(`${req.name} added`);
  };

  const addFriend = (name: string) => {
    const clean = name.trim().slice(0, 16);
    if (!clean) return;
    const known = DIRECTORY.find((d) => d.name.toLowerCase() === clean.toLowerCase());
    setRequests((list) => [...list, { id: `out-${Date.now()}`, name: known?.name || clean, fromMe: true }]);
    setAddName(""); setNotice(`Request sent to ${clean}`);
    go({ page: "friendlist", action: "request" });
  };

  if (playing) {
    return (
      <div className="shell">
        <div className="edge red" /><div className="edge blue" />
        <PlayView key={matchId} mode={mode} mapId={mapId} team={team} name={profile.name} primary={startWeapon(mode)} lookScale={profile.lookScale} invertY={profile.invertY} muted={profile.muted} startMoney={profile.startMoney} botCount={bots} onHud={setHud} onMatchEnd={onMatchEnd} />
        {hud && (
          <Hud hud={hud} muted={profile.muted} buyOpen={buyOpen} shopTab={shopTab} onShopTab={setShopTab}
            onBuy={(id) => { const ok = window.__pulseBuy?.(id); setShopMsg(ok ? "Purchased" : "Not enough cash"); }}
            onToggleBuy={() => { setBuyOpen((v) => !v); window.__pulseArena?.toggleShop?.(); }}
            onMuted={(v) => patch({ muted: v })} onLeave={() => go({ page: route.page === "game" ? "game" : route.page, action: "" })} />
        )}
        {shopMsg && <p className="toast">{shopMsg}</p>}
      </div>
    );
  }

  const setupFields = (
    <>
      <label>Mode</label>
      <div className="grid4">{MODES.map((m) => (<button key={m} className={cn("card", mode === m && "on")} onClick={() => setMode(m)}><b>{MODE_LABEL[m]}</b></button>))}</div>
      <p className="muted">{MODE_BLURB[mode]}</p>
      {mode !== "deathmatch" && mode !== "armsrace" && (
        <>
          <label>Team / character</label>
          <div className="row">
            <button className={cn("team blue", team === "blue" && "on")} onClick={() => { setTeam("blue"); patch({ character: BLUE_CHARS[0]! }); }}>Force</button>
            <button className={cn("team red", team === "red" && "on")} onClick={() => { setTeam("red"); patch({ character: RED_CHARS[0]! }); }}>Rogue</button>
          </div>
          <div className="grid4">{chars.map((c) => (<button key={c} className={cn("card", profile.character === c && "on")} onClick={() => patch({ character: c })}><b>{c}</b></button>))}</div>
        </>
      )}
      <label>Map · {maps.length}</label>
      <div className="grid3 mapgrid">{maps.map((m) => (<button key={m.id} className={cn("card", mapId === m.id && "on")} onClick={() => setMapId(m.id)}><b>{m.name}</b><span>{m.code}</span></button>))}</div>
      <label>Bots {bots}</label>
      <input type="range" min={2} max={9} step={1} value={bots} onChange={(e) => setBots(Number(e.target.value))} />
    </>
  );

  const serverList = (list: ServerRoom[]) => (
    <div className="list">
      {list.map((room) => (
        <article key={room.id} className="list-card">
          <div><b>{room.name}</b><span>{room.id} · {MODE_LABEL[room.mode]} · {room.map} · {room.region} · {room.players}/{room.max} · {room.ping}ms</span></div>
          <button className="mini" onClick={() => launchRoom(room)}>{room.open ? "Join" : "Full"}</button>
        </article>
      ))}
      {list.length === 0 && <p className="muted">No rooms match that filter.</p>}
    </div>
  );

  let body: ReactNode = null;
  let back: (() => void) | undefined;

  if (route.page === "main") {
    body = (<><p className="lead">HQ index. Every screen has a URL under /ui/ so you can bookmark it.</p>
      <div className="grid3">
        <button className="card" onClick={() => go({ page: "singleplayer" })}><b>Singleplayer</b><span>/ui/singleplayer</span></button>
        <button className="card" onClick={() => go({ page: "multiplayer" })}><b>Multiplayer</b><span>/ui/multiplayer</span></button>
        <button className="card" onClick={() => go({ page: "serverplayer" })}><b>Servers</b><span>/ui/serverplayer</span></button>
        <button className="card" onClick={() => go({ page: "friendlist" })}><b>Friends</b><span>/ui/friendlist</span></button>
        <button className="card" onClick={() => go({ page: "team" })}><b>Team / character</b><span>/ui/team</span></button>
        <button className="card" onClick={() => go({ page: "settings" })}><b>Settings</b><span>/ui/settings</span></button>
      </div>
      <label>All routes</label>
      <div className="linkgrid">{LINKS.map((link) => (<button key={link.label} className="ghost tiny" onClick={() => go(link.route)}>{link.label}</button>))}</div>
      {notice && <p className="muted">{notice}</p>}</>);
  } else if (route.page === "game") {
    body = (<><p className="lead">Pick how to start a match.</p>
      <button className="deploy" onClick={() => go({ page: "singleplayer", action: "create" })}>Solo match</button>
      <div className="row"><button className="ghost" onClick={() => go({ page: "multiplayer" })}>Multiplayer</button><button className="ghost" onClick={() => go({ page: "serverplayer", action: "find" })}>Find server</button></div></>);
  } else if (route.page === "singleplayer" && route.action === "create") {
    back = () => go({ page: "singleplayer" });
    body = (<>{setupFields}<button className="deploy" onClick={() => startMatch({ page: "singleplayer" })}>Start solo</button></>);
  } else if (route.page === "singleplayer") {
    body = (<><p className="lead">Practice against bots. Live arena: /ui/singleplayer/game</p>
      <button className="deploy" onClick={() => go({ page: "singleplayer", action: "create" })}>Create match</button>
      <button className="ghost" onClick={() => startMatch({ page: "singleplayer" })}>Quick deploy</button></>);
  } else if (route.page === "multiplayer" && route.action === "create") {
    back = () => go({ page: "multiplayer" });
    body = (<><label>Room name</label><input value={roomName} maxLength={24} onChange={(e) => setRoomName(e.target.value)} />{setupFields}
      <button className="deploy" onClick={() => { const room = createRoom({ name: roomName, mode, map: mapId }); setRooms(loadRooms()); launchRoom(room); }}>Create and enter</button></>);
  } else if (route.page === "multiplayer" && route.action === "join") {
    back = () => go({ page: "multiplayer" });
    body = (<><label>Room code or name</label><input value={joinCode} placeholder="OWN-AB12 or Pulse Hall" onChange={(e) => setJoinCode(e.target.value)} />
      <button className="deploy" onClick={() => { const hit = rooms.find((r) => r.id.toLowerCase() === joinCode.trim().toLowerCase() || r.name.toLowerCase() === joinCode.trim().toLowerCase()); if (hit) launchRoom(hit); else setNotice("No room with that code."); }}>Join</button>
      {notice && <p className="muted">{notice}</p>}</>);
  } else if (route.page === "multiplayer") {
    body = (<><p className="lead">Host or join a room. Empty seats fill with bots.</p>
      <button className="deploy" onClick={() => go({ page: "multiplayer", action: "create" })}>Create room</button>
      <div className="row"><button className="ghost" onClick={() => go({ page: "multiplayer", action: "join" })}>Join by code</button><button className="ghost" onClick={() => go({ page: "serverplayer", action: "find" })}>Browse servers</button></div></>);
  } else if (route.page === "settings") {
    body = (<><label>Callsign</label><input value={profile.name} maxLength={16} onChange={(e) => patch({ name: e.target.value.slice(0, 16) })} />
      <label>Look sensitivity {profile.lookScale.toFixed(2)}x</label>
      <input type="range" min={0.4} max={2.4} step={0.05} value={profile.lookScale} onChange={(e) => patch({ lookScale: Number(e.target.value) })} />
      <label>Start money ${profile.startMoney}</label>
      <input type="range" min={400} max={4000} step={100} value={profile.startMoney} onChange={(e) => patch({ startMoney: Number(e.target.value) })} />
      <div className="row">
        <button className={cn("card", profile.invertY && "on")} onClick={() => patch({ invertY: !profile.invertY })}><b>{profile.invertY ? "Y inverted" : "Y normal"}</b></button>
        <button className={cn("card", profile.muted && "on")} onClick={() => patch({ muted: !profile.muted })}><b>{profile.muted ? "Muted" : "Sound on"}</b></button>
      </div>
      <button className="ghost" onClick={() => go({ page: "team" })}>Choose team / character</button></>);
  } else if (route.page === "team") {
    body = (<><p className="lead">Force is blue. Rogue is red.</p>
      <div className="row">
        <button className={cn("team blue", team === "blue" && "on")} onClick={() => { setTeam("blue"); patch({ character: BLUE_CHARS[0]! }); }}>Force Blue</button>
        <button className={cn("team red", team === "red" && "on")} onClick={() => { setTeam("red"); patch({ character: RED_CHARS[0]! }); }}>Rogue Red</button>
      </div>
      <label>Character</label>
      <div className="grid4">{chars.map((c) => (<button key={c} className={cn("card", profile.character === c && "on")} onClick={() => patch({ character: c })}><b>{c}</b></button>))}</div>
      <button className="deploy" onClick={() => go({ page: "singleplayer", action: "create" })}>Continue to create</button></>);
  } else if (route.page === "serverplayer" && route.action === "create") {
    back = () => go({ page: "serverplayer" });
    body = (<><label>Server name</label><input value={roomName} maxLength={24} onChange={(e) => setRoomName(e.target.value)} />{setupFields}
      <button className="deploy" onClick={() => { const room = createRoom({ name: roomName, mode, map: mapId }); setRooms(loadRooms()); launchRoom(room); }}>Create server</button></>);
  } else if (route.page === "serverplayer" && route.action === "join") {
    back = () => go({ page: "serverplayer" });
    body = (<><label>Server name or id</label><input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Pulse Hall or SRV-01" />
      <button className="deploy" onClick={() => { const hit = rooms.find((r) => r.id.toLowerCase() === joinCode.trim().toLowerCase() || r.name.toLowerCase() === joinCode.trim().toLowerCase()); if (hit) launchRoom(hit); else setNotice("Server not found."); }}>Join server</button>{serverList(rooms.slice(0, 6))}</>);
  } else if (route.page === "serverplayer" && route.action === "filter") {
    back = () => go({ page: "serverplayer", action: "find" });
    body = (<><label>Filter</label>
      <div className="grid4">{["", "open", "lowping", "full", "local"].map((f) => (<button key={f || "all"} className={cn("card", (route.filter || "") === f && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: f, q: route.q, mode: route.mode })}><b>{f || "all"}</b></button>))}</div>
      <label>Mode</label>
      <div className="grid4">
        <button className={cn("card", !route.mode && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: route.filter, q: route.q })}><b>Any</b></button>
        {MODES.map((m) => (<button key={m} className={cn("card", route.mode === m && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: route.filter, mode: m, q: route.q })}><b>{MODE_LABEL[m]}</b></button>))}
      </div>{serverList(visibleRooms)}</>);
  } else if (route.page === "serverplayer" && (route.action === "search" || route.action === "find")) {
    back = () => go({ page: "serverplayer" });
    body = (<><label>Search</label>
      <input type="search" defaultValue={route.q} placeholder="Name, id, region, mode" onKeyDown={(e) => { if (e.key === "Enter") go({ page: "serverplayer", action: route.action as UiAction, q: (e.target as HTMLInputElement).value, filter: route.filter, mode: route.mode }); }} />
      <div className="row"><button className="ghost" onClick={() => go({ page: "serverplayer", action: "filter", q: route.q })}>Filters</button></div>{serverList(visibleRooms)}</>);
  } else if (route.page === "serverplayer") {
    body = (<><p className="lead">Public board plus rooms you create. Example: /ui/serverplayer/game/Pulse%20Hall</p>
      <div className="row">
        <button className="ghost" onClick={() => go({ page: "serverplayer", action: "create" })}>Create</button>
        <button className="ghost" onClick={() => go({ page: "serverplayer", action: "join" })}>Join</button>
        <button className="ghost" onClick={() => go({ page: "serverplayer", action: "find" })}>Find</button>
      </div>{serverList(rooms.slice(0, 8))}</>);
  } else if (route.page === "friendlist" && route.action === "add") {
    back = () => go({ page: "friendlist" });
    body = (<><label>Callsign</label><input value={addName} maxLength={16} placeholder="Scout-11" onChange={(e) => setAddName(e.target.value)} />
      <button className="deploy" onClick={() => addFriend(addName)}>Send request</button>
      <label>Suggested</label>
      <div className="list">{DIRECTORY.filter((d) => !friends.some((f) => f.id === d.id)).map((d) => (<article key={d.id} className="list-card"><div><b>{d.name}</b><span>{d.status}</span></div><button className="mini" onClick={() => addFriend(d.name)}>Add</button></article>))}</div></>);
  } else if (route.page === "friendlist" && route.action === "request") {
    back = () => go({ page: "friendlist" });
    body = (<div className="list">{requests.map((req) => (<article key={req.id} className="list-card"><div><b>{req.name}</b><span>{req.fromMe ? "Outgoing" : "Incoming"}</span></div>{!req.fromMe && <button className="mini" onClick={() => acceptRequest(req)}>Accept</button>}<button className="mini ghost" onClick={() => setRequests((list) => list.filter((r) => r.id !== req.id))}>{req.fromMe ? "Cancel" : "Decline"}</button></article>))}{requests.length === 0 && <p className="muted">No pending requests.</p>}</div>);
  } else if (route.page === "friendlist" && (route.action === "find" || route.action === "search")) {
    back = () => go({ page: "friendlist" });
    const q = (route.action === "search" ? route.q : friendQuery).toLowerCase();
    const pool = DIRECTORY.filter((d) => !q || d.name.toLowerCase().includes(q));
    body = (<><label>Find</label>
      <input type="search" value={friendQuery} placeholder="Search operators" onChange={(e) => setFriendQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ page: "friendlist", action: "search", q: friendQuery }); }} />
      <div className="list">{pool.map((d) => (<article key={d.id} className="list-card"><div><b>{d.name}</b><span>{d.status} · {d.team}</span></div><button className="mini" onClick={() => addFriend(d.name)}>Add</button></article>))}</div></>);
  } else if (route.page === "friendlist") {
    body = (<><div className="row">
      <button className="ghost" onClick={() => go({ page: "friendlist", action: "find" })}>Find</button>
      <button className="ghost" onClick={() => go({ page: "friendlist", action: "add" })}>Add</button>
      <button className="ghost" onClick={() => go({ page: "friendlist", action: "request" })}>Requests</button>
    </div>
    <div className="list">{friends.map((f) => (<article key={f.id} className="list-card"><div><b>{f.name}</b><span>{f.status} · {f.team}</span></div><button className="mini" onClick={() => go({ page: "multiplayer", action: "create" })}>Invite</button></article>))}{friends.length === 0 && <p className="muted">No friends yet.</p>}</div></>);
  } else if (route.page === "armory") {
    body = (<div className="shop">{(["pm", "glock", "deagle", "mp5", "ak47", "m4", "awp", "m249"] as WeaponId[]).map((id) => { const w = WEAPONS[id]; const owned = profile.owned.includes(id); return (<article key={id} className={cn("shop-card", owned && "owned")}><div><b>{w.name}</b><span>${w.price}</span></div><button disabled={owned} onClick={() => { if (profile.credits < w.price) { setNotice("Need more credits"); return; } setProfile((p) => ({ ...p, credits: p.credits - w.price, owned: [...p.owned, id] })); }}>{owned ? "Owned" : `Buy ${w.price}`}</button></article>); })}</div>);
  }

  return (<div className="shell"><div className="edge red" /><div className="edge blue" /><Frame route={route} profile={profile} onBack={back}>{body}</Frame></div>);
}
