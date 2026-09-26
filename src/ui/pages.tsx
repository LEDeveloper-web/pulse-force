import { useMemo, useState } from "react";
import { MAP_LIST, type MapId } from "../game/maps";
import { WEAPONS, type WeaponId } from "../game/weapons";
import { MODE_BLURB, MODE_LABEL, type GameMode, type Team } from "../game/types";
import { BLUE_CHARS, RED_CHARS, type Profile } from "../game/profile";
import { go, type Route } from "./path";
import { AccountChip } from "./flow";
import type { Account } from "./account";
import {
  COUNTRIES,
  DIRECTORY,
  filterRooms,
  loadFriends,
  loadRequests,
  saveFriends,
  saveRequests,
  type Friend,
  type FriendRequest,
  type ServerRoom,
} from "./lobby";

const MODES: GameMode[] = ["classic","resurrection","ctf","zombie","bomb","knives","deathmatch","armsrace","sniper"];
function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

function Top(props: { kicker: string; title: string; back?: () => void }) {
  return (
    <header className="alone-top">
      {props.back && <button className="backonly" onClick={props.back}>Back</button>}
      <p className="kicker">{props.kicker}</p>
      <h1>{props.title}</h1>
    </header>
  );
}

export function MainMenu(props: { name: string; account: Account | null; onAuth: () => void; onSignOut: () => void }) {
  return (
    <div className="screen screen-main">
      <AccountChip account={props.account} onOpen={props.onAuth} onSignOut={props.onSignOut} />
      <p className="poster">PULSE FORCE</p>
      <p className="tag">{props.name}{props.account ? ` · ${props.account.id}` : ""}</p>
      <div className="stack">
        <button className="big" onClick={() => go({ page: "singleplayer" })}>Singleplayer</button>
        <button className="big alt" onClick={() => go({ page: "multiplayer" })}>Multiplayer</button>
        <button className="big alt" onClick={() => go({ page: "serverplayer" })}>ServerPlayer</button>
        <button className="big alt" onClick={() => go({ page: "friendlist" })}>Friends</button>
        <button className="big alt" onClick={() => go({ page: "settings" })}>Settings</button>
      </div>
      <p className="muted">Offline solo · Local hotspot · Online internet</p>
    </div>
  );
}

export function GameHub() {
  return (
    <div className="screen screen-game">
      <Top kicker="Game" title="Play" back={() => go({ page: "main" })} />
      <div className="stack">
        <button className="big" onClick={() => go({ page: "singleplayer" })}>Solo</button>
        <button className="big alt" onClick={() => go({ page: "multiplayer" })}>Local rooms</button>
        <button className="big alt" onClick={() => go({ page: "serverplayer", action: "search" })}>Server list</button>
      </div>
    </div>
  );
}

export function SetupForm(props: {
  mode: GameMode; mapId: MapId; team: Team; bots: number; character: string;
  onMode: (m: GameMode) => void; onMap: (m: MapId) => void; onTeam: (t: Team) => void;
  onBots: (n: number) => void; onCharacter: (c: string) => void;
}) {
  const maps = props.mode === "bomb" ? MAP_LIST.filter((m) => m.bombOk) : MAP_LIST;
  const chars = props.team === "blue" ? BLUE_CHARS : RED_CHARS;
  return (
    <>
      <label>Mode</label>
      <div className="grid4">{MODES.map((m) => (
        <button key={m} className={cn("card", props.mode === m && "on")} onClick={() => props.onMode(m)}><b>{MODE_LABEL[m]}</b></button>
      ))}</div>
      <p className="muted">{MODE_BLURB[props.mode]}</p>
      {props.mode !== "deathmatch" && props.mode !== "armsrace" && (
        <>
          <label>Team</label>
          <div className="row">
            <button className={cn("team blue", props.team === "blue" && "on")} onClick={() => props.onTeam("blue")}>Force</button>
            <button className={cn("team red", props.team === "red" && "on")} onClick={() => props.onTeam("red")}>Rogue</button>
          </div>
          <label>Character</label>
          <div className="grid4">{chars.map((c) => (
            <button key={c} className={cn("card", props.character === c && "on")} onClick={() => props.onCharacter(c)}><b>{c}</b></button>
          ))}</div>
        </>
      )}
      <label>Map</label>
      <div className="grid3 mapgrid">{maps.map((m) => (
        <button key={m.id} className={cn("card", props.mapId === m.id && "on")} onClick={() => props.onMap(m.id)}><b>{m.name}</b><span>{m.code}</span></button>
      ))}</div>
      <label>Bots {props.bots}</label>
      <input type="range" min={2} max={9} step={1} value={props.bots} onChange={(e) => props.onBots(Number(e.target.value))} />
    </>
  );
}

export function SingleplayerHome() {
  return (
    <div className="screen screen-solo">
      <Top kicker="Singleplayer · offline solo" title="Vs Bots" back={() => go({ page: "main" })} />
      <div className="stack">
        <button className="big" onClick={() => go({ page: "singleplayer", action: "create" })}>Create match</button>
        <button className="big alt" onClick={() => go({ page: "singleplayer", action: "game" })}>Quick start</button>
        <button className="big alt" onClick={() => go({ page: "team" })}>Choose team</button>
      </div>
    </div>
  );
}

export function SingleplayerCreate(props: {
  mode: GameMode; mapId: MapId; team: Team; bots: number; character: string;
  onMode: (m: GameMode) => void; onMap: (m: MapId) => void; onTeam: (t: Team) => void;
  onBots: (n: number) => void; onCharacter: (c: string) => void; onStart: () => void;
}) {
  return (
    <div className="screen screen-solo">
      <Top kicker="Singleplayer / create" title="New Game" back={() => go({ page: "singleplayer" })} />
      <div className="scroll">
        <SetupForm {...props} />
        <button className="big" onClick={props.onStart}>Start</button>
      </div>
    </div>
  );
}

export function MultiplayerHome() {
  return (
    <div className="screen screen-mp">
      <Top kicker="Multiplayer · local hotspot" title="Local play" back={() => go({ page: "main" })} />
      <div className="stack">
        <button className="big" onClick={() => go({ page: "multiplayer", action: "create" })}>Create game</button>
        <button className="big alt" onClick={() => go({ page: "multiplayer", action: "join" })}>Join by host IP</button>
      </div>
    </div>
  );
}

export function MultiplayerCreate(props: {
  roomName: string; setRoomName: (v: string) => void; onCreate: () => void; hostIp?: string;
  mode: GameMode; mapId: MapId; team: Team; bots: number; character: string;
  onMode: (m: GameMode) => void; onMap: (m: MapId) => void; onTeam: (t: Team) => void;
  onBots: (n: number) => void; onCharacter: (c: string) => void;
}) {
  return (
    <div className="screen screen-mp">
      <Top kicker="Multiplayer / create · hotspot host" title="Host" back={() => go({ page: "multiplayer" })} />
      <div className="scroll">
        <label>Room name</label>
        <input value={props.roomName} maxLength={24} onChange={(e) => props.setRoomName(e.target.value)} />
        {props.hostIp ? <p className="muted">Host IP {props.hostIp}</p> : <p className="muted">Your LAN IP shows on the in-game Menu after you start.</p>}
        <SetupForm {...props} />
        <button className="big" onClick={props.onCreate}>Create and play</button>
      </div>
    </div>
  );
}

export function MultiplayerJoin(props: { code: string; setCode: (v: string) => void; rooms: ServerRoom[]; onJoin: (r?: ServerRoom) => void; note: string }) {
  return (
    <div className="screen screen-mp">
      <Top kicker="Multiplayer / join · member on host WiFi" title="Join host" back={() => go({ page: "multiplayer" })} />
      <label>Host IP</label>
      <input value={props.code} onChange={(e) => props.setCode(e.target.value)} placeholder="192.168.43.1" />
      <button className="big" onClick={() => props.onJoin()}>Join game</button>
      {props.note && <p className="muted">{props.note}</p>}
      <div className="list">{props.rooms.slice(0, 6).map((r) => (
        <button key={r.id} className="rowcard" onClick={() => props.onJoin(r)}><b>{r.name}</b><span>{r.id}</span></button>
      ))}</div>
    </div>
  );
}

export function SettingsPage(props: { profile: Profile; account?: Account | null; patch: (p: Partial<Profile>) => void }) {
  const p = props.profile;
  return (
    <div className="screen screen-set">
      <Top kicker="Settings" title="Options" back={() => go({ page: "main" })} />
      <div className="scroll">
        <label>Callsign</label>
        <input value={p.name} maxLength={16} onChange={(e) => props.patch({ name: e.target.value.slice(0, 16) })} />
        {props.account && <p className="muted">ID {props.account.id} · {props.account.email}</p>}
        {!props.account && <p className="muted">Sign in on Main to lock an ID to this name.</p>}
        <label>Look {p.lookScale.toFixed(2)}x</label>
        <input type="range" min={0.4} max={2.4} step={0.05} value={p.lookScale} onChange={(e) => props.patch({ lookScale: Number(e.target.value) })} />
        <label>Start cash ${p.startMoney}</label>
        <input type="range" min={400} max={4000} step={100} value={p.startMoney} onChange={(e) => props.patch({ startMoney: Number(e.target.value) })} />
        <div className="row">
          <button className={cn("card", p.invertY && "on")} onClick={() => props.patch({ invertY: !p.invertY })}><b>{p.invertY ? "Y inverted" : "Y normal"}</b></button>
          <button className={cn("card", p.muted && "on")} onClick={() => props.patch({ muted: !p.muted })}><b>{p.muted ? "Muted" : "Sound on"}</b></button>
        </div>
      </div>
    </div>
  );
}

export function TeamPage(props: { team: Team; character: string; onTeam: (t: Team) => void; onCharacter: (c: string) => void }) {
  const chars = props.team === "blue" ? BLUE_CHARS : RED_CHARS;
  return (
    <div className="screen screen-team">
      <Top kicker="Team" title="Operator" back={() => go({ page: "main" })} />
      <div className="row">
        <button className={cn("team blue", props.team === "blue" && "on")} onClick={() => props.onTeam("blue")}>Force</button>
        <button className={cn("team red", props.team === "red" && "on")} onClick={() => props.onTeam("red")}>Rogue</button>
      </div>
      <div className="grid4">{chars.map((c) => (
        <button key={c} className={cn("card", props.character === c && "on")} onClick={() => props.onCharacter(c)}><b>{c}</b></button>
      ))}</div>
      <button className="big" onClick={() => go({ page: "singleplayer", action: "create" })}>Use this team</button>
    </div>
  );
}

function ServerRows(props: { rooms: ServerRoom[]; onJoin: (r: ServerRoom) => void }) {
  return (
    <div className="list">
      {props.rooms.map((r) => (
        <button key={r.id} className="rowcard" onClick={() => props.onJoin(r)}>
          <b>{r.name}</b>
          <span>{r.country} · {r.ip || r.id} · {MODE_LABEL[r.mode]} · {r.map} · {r.players}/{r.max} · {r.ping}ms</span>
        </button>
      ))}
      {props.rooms.length === 0 && <p className="muted">No servers.</p>}
    </div>
  );
}

export function ServerHome(props: { rooms: ServerRoom[]; onJoin: (r: ServerRoom) => void }) {
  return (
    <div className="screen screen-srv">
      <Top kicker="ServerPlayer · online internet" title="Official servers" back={() => go({ page: "main" })} />
      <div className="stack slim">
        <button className="big" onClick={() => go({ page: "serverplayer", action: "create" })}>Create</button>
        <button className="big alt" onClick={() => go({ page: "serverplayer", action: "join" })}>Join</button>
        <button className="big alt" onClick={() => go({ page: "serverplayer", action: "search" })}>Search</button>
        <button className="big alt" onClick={() => go({ page: "serverplayer", action: "filter" })}>Filter</button>
      </div>
      <ServerRows rooms={props.rooms.slice(0, 6)} onJoin={props.onJoin} />
    </div>
  );
}

export function ServerCreate(props: {
  roomName: string; setRoomName: (v: string) => void; onCreate: () => void;
  country: string; setCountry: (v: string) => void;
  mode: GameMode; mapId: MapId; team: Team; bots: number; character: string;
  onMode: (m: GameMode) => void; onMap: (m: MapId) => void; onTeam: (t: Team) => void;
  onBots: (n: number) => void; onCharacter: (c: string) => void;
}) {
  return (
    <div className="screen screen-srv">
      <Top kicker="Servers / create · internet" title="New server" back={() => go({ page: "serverplayer" })} />
      <div className="scroll">
        <label>Server name</label>
        <input value={props.roomName} maxLength={24} onChange={(e) => props.setRoomName(e.target.value)} />
        <label>Country</label>
        <div className="grid4">{COUNTRIES.map((c) => (
          <button key={c} className={cn("card", props.country === c && "on")} onClick={() => props.setCountry(c)}><b>{c === "INT" ? "International" : c}</b></button>
        ))}</div>
        <SetupForm {...props} />
        <button className="big" onClick={props.onCreate}>Open server</button>
      </div>
    </div>
  );
}

export function ServerJoin(props: { code: string; setCode: (v: string) => void; rooms: ServerRoom[]; onJoin: (r?: ServerRoom) => void; note: string }) {
  return (
    <div className="screen screen-srv">
      <Top kicker="Servers / join" title="Enter" back={() => go({ page: "serverplayer" })} />
      <input value={props.code} onChange={(e) => props.setCode(e.target.value)} placeholder="Host IP or server name" />
      <button className="big" onClick={() => props.onJoin()}>Join</button>
      {props.note && <p className="muted">{props.note}</p>}
      <ServerRows rooms={props.rooms} onJoin={(r) => props.onJoin(r)} />
    </div>
  );
}

export function ServerFind(props: { route: Route; rooms: ServerRoom[]; onJoin: (r: ServerRoom) => void }) {
  const list = useMemo(() => filterRooms(props.rooms, props.route), [props.rooms, props.route]);
  const search = props.route.action === "search" || props.route.action === "find";
  const sorted = [...list].sort((a, b) => a.ping - b.ping);
  return (
    <div className="screen screen-srv">
      <Top kicker={`Servers / ${props.route.action === "filter" ? "filter" : "search"}`} title={props.route.action === "filter" ? "Filter" : "Search"} back={() => go({ page: "serverplayer" })} />
      {search && (
        <input type="search" defaultValue={props.route.q} placeholder="Search name, IP, country" onKeyDown={(e) => {
          if (e.key === "Enter") go({ page: "serverplayer", action: "search", q: (e.target as HTMLInputElement).value, filter: props.route.filter, mode: props.route.mode });
        }} />
      )}
      {props.route.action === "filter" && (
        <>
          <label>Country</label>
          <div className="grid4">{["", "INT", ...COUNTRIES.filter((c) => c !== "INT")].map((f) => (
            <button key={f || "all"} className={cn("card", (props.route.filter || "") === f.toLowerCase() && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: f.toLowerCase(), q: props.route.q, mode: props.route.mode })}>
              <b>{f === "" ? "All" : f === "INT" ? "International" : f}</b>
            </button>
          ))}</div>
          <div className="grid4">
            <button className={cn("card", !props.route.mode && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: props.route.filter })}><b>Any mode</b></button>
            {MODES.map((m) => (
              <button key={m} className={cn("card", props.route.mode === m && "on")} onClick={() => go({ page: "serverplayer", action: "filter", filter: props.route.filter, mode: m })}><b>{MODE_LABEL[m]}</b></button>
            ))}
          </div>
        </>
      )}
      <p className="muted">Sorted by ping (ms).</p>
      <ServerRows rooms={sorted} onJoin={props.onJoin} />
    </div>
  );
}

export function FriendsHome() {
  const [friends] = useState<Friend[]>(() => loadFriends());
  return (
    <div className="screen screen-fr">
      <Top kicker="Friends" title="List" back={() => go({ page: "main" })} />
      <div className="stack slim">
        <button className="big alt" onClick={() => go({ page: "friendlist", action: "find" })}>Find</button>
        <button className="big alt" onClick={() => go({ page: "friendlist", action: "add" })}>Add</button>
        <button className="big alt" onClick={() => go({ page: "friendlist", action: "request" })}>Requests</button>
      </div>
      <div className="list">{friends.map((f) => (
        <div key={f.id} className="rowcard"><b>{f.name}</b><span>{f.status}</span></div>
      ))}</div>
    </div>
  );
}

export function FriendsFind() {
  const [q, setQ] = useState("");
  const pool = DIRECTORY.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="screen screen-fr">
      <Top kicker="Friends / find" title="Find" back={() => go({ page: "friendlist" })} />
      <input type="search" value={q} placeholder="Name" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ page: "friendlist", action: "search", q }); }} />
      <div className="list">{pool.map((d) => (
        <button key={d.id} className="rowcard" onClick={() => {
          const reqs = loadRequests();
          saveRequests([...reqs, { id: `out-${Date.now()}`, name: d.name, fromMe: true }]);
          go({ page: "friendlist", action: "request" });
        }}><b>{d.name}</b><span>{d.status} · add</span></button>
      ))}</div>
    </div>
  );
}

export function FriendsAdd() {
  const [name, setName] = useState("");
  return (
    <div className="screen screen-fr">
      <Top kicker="Friends / add" title="Add" back={() => go({ page: "friendlist" })} />
      <input value={name} maxLength={16} placeholder="Scout-11" onChange={(e) => setName(e.target.value)} />
      <button className="big" onClick={() => {
        if (!name.trim()) return;
        saveRequests([...loadRequests(), { id: `out-${Date.now()}`, name: name.trim(), fromMe: true }]);
        go({ page: "friendlist", action: "request" });
      }}>Send request</button>
    </div>
  );
}

export function FriendsRequests() {
  const [reqs, setReqs] = useState<FriendRequest[]>(() => loadRequests());
  return (
    <div className="screen screen-fr">
      <Top kicker="Friends / request" title="Requests" back={() => go({ page: "friendlist" })} />
      <div className="list">{reqs.map((r) => (
        <div key={r.id} className="rowcard">
          <div><b>{r.name}</b><span>{r.fromMe ? "Outgoing" : "Incoming"}</span></div>
          {!r.fromMe && <button className="mini" onClick={() => {
            const next = reqs.filter((x) => x.id !== r.id);
            setReqs(next); saveRequests(next);
            saveFriends([...loadFriends(), { id: r.id, name: r.name, status: "online", team: "blue" }]);
          }}>Accept</button>}
          <button className="mini ghost" onClick={() => { const next = reqs.filter((x) => x.id !== r.id); setReqs(next); saveRequests(next); }}>X</button>
        </div>
      ))}{reqs.length === 0 && <p className="muted">None</p>}</div>
    </div>
  );
}

export function ArmoryPage(props: { profile: Profile; setProfile: (p: Profile) => void }) {
  return (
    <div className="screen screen-set">
      <Top kicker="Armory" title="Shop" back={() => go({ page: "main" })} />
      <div className="list">{(["pm","glock","deagle","mp5","ak47","m4","awp","m249"] as WeaponId[]).map((id) => {
        const w = WEAPONS[id]; const owned = props.profile.owned.includes(id);
        return (
          <div key={id} className="rowcard">
            <div><b>{w.name}</b><span>${w.price}</span></div>
            <button className="mini" disabled={owned} onClick={() => {
              if (props.profile.credits < w.price) return;
              props.setProfile({ ...props.profile, credits: props.profile.credits - w.price, owned: [...props.profile.owned, id] });
            }}>{owned ? "Owned" : "Buy"}</button>
          </div>
        );
      })}</div>
    </div>
  );
}
