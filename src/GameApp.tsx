import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaEngine } from "./game/engine";
import { MAP_LIST, type MapId } from "./game/maps";
import { WEAPON_ORDER, WEAPONS, type WeaponId } from "./game/weapons";
import { MODE_BLURB, MODE_LABEL, type GameMode, type HudState, type Team } from "./game/types";

const MODES: GameMode[] = ["tdm", "ffa", "ctf", "koth", "dom", "hp", "gg", "inf"];
const NAMES = ["Ranger", "Scout", "Vesper", "Comet", "Quill", "Harbor", "Nimbus", "Atlas"];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function randomName() {
  return `${NAMES[Math.floor(Math.random() * NAMES.length)]}-${Math.floor(10 + Math.random() * 89)}`;
}
function formatTime(s: number) {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}

export function GameApp() {
  const [phase, setPhase] = useState<"menu" | "playing" | "results">("menu");
  const [mode, setMode] = useState<GameMode>("tdm");
  const [mapId, setMapId] = useState<MapId>("hall");
  const [weapon, setWeapon] = useState<WeaponId>("rifle");
  const [team, setTeam] = useState<Team>("red");
  const [name, setName] = useState(randomName());
  const [hud, setHud] = useState<HudState | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [matchId, setMatchId] = useState(0);
  const [muted, setMuted] = useState(false);

  const startSolo = () => {
    setWinner(null);
    setMatchId((n) => n + 1);
    setPhase("playing");
  };
  const onMatchEnd = useCallback((w: string) => {
    setWinner(w);
    setPhase("results");
  }, []);

  return (
    <div className="shell">
      <div className="edge red" />
      <div className="edge blue" />
      {phase !== "menu" && (
        <PlayView
          key={matchId}
          mode={mode}
          mapId={mapId}
          weapon={weapon}
          team={team}
          name={name}
          onHud={setHud}
          onMatchEnd={onMatchEnd}
        />
      )}
      {phase === "menu" && (
        <div className="menu">
          <p className="kicker">Special Forces Group</p>
          <h1>PULSE FORCE</h1>
          <p className="lead">Eight modes. Five maps. Six pulse weapons. Deploy solo against bots.</p>
          <label>Callsign</label>
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value.slice(0, 16))} />
          <label>Mode</label>
          <div className="grid4">
            {MODES.map((m) => (
              <button key={m} className={cn("card", mode === m && "on")} onClick={() => setMode(m)}>
                <b>{MODE_LABEL[m]}</b>
              </button>
            ))}
          </div>
          <p className="muted">{MODE_BLURB[mode]}</p>
          {mode !== "ffa" && mode !== "gg" && mode !== "inf" && (
            <div className="row">
              <button className={cn("team red", team === "red" && "on")} onClick={() => setTeam("red")}>Alpha Red</button>
              <button className={cn("team blue", team === "blue" && "on")} onClick={() => setTeam("blue")}>Bravo Blue</button>
            </div>
          )}
          <label>Map</label>
          <div className="grid3">
            {MAP_LIST.map((m) => (
              <button key={m.id} className={cn("card", mapId === m.id && "on")} onClick={() => setMapId(m.id)}>
                <b>{m.name}</b>
                <span>{m.code}</span>
              </button>
            ))}
          </div>
          <label>Weapon</label>
          <div className="grid3">
            {WEAPON_ORDER.map((id) => (
              <button key={id} className={cn("card", weapon === id && "on")} onClick={() => setWeapon(id)}>
                <b>{WEAPONS[id].name}</b>
                <span>{WEAPONS[id].className}</span>
              </button>
            ))}
          </div>
          <button className="deploy" onClick={startSolo}>Deploy Solo</button>
        </div>
      )}
      {phase === "playing" && hud && (
        <Hud hud={hud} muted={muted} onMuted={setMuted} onLeave={() => setPhase("menu")} />
      )}
      {phase === "results" && (
        <div className="overlay">
          <div className="panel">
            <p className="kicker">Match over</p>
            <h2>{winner ?? "Draw"}</h2>
            <ul>
              {hud?.board.map((p) => (
                <li key={p.id}>
                  <span className={p.team}>{p.name}{p.bot ? " · bot" : ""}</span>
                  <span>{Math.floor(p.score)}</span>
                </li>
              ))}
            </ul>
            <div className="row">
              <button className="deploy" onClick={startSolo}>Redeploy</button>
              <button onClick={() => setPhase("menu")}>HQ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayView(props: {
  mode: GameMode; mapId: MapId; weapon: WeaponId; team: Team; name: string;
  onHud: (h: HudState) => void; onMatchEnd: (w: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const [needClick, setNeedClick] = useState(true);
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches); }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: ArenaEngine | null = null;
    void import("./game/engine").then(({ ArenaEngine }) => {
      if (cancelled || !canvasRef.current) return;
      engine = new ArenaEngine({
        canvas: canvasRef.current,
        role: "solo",
        mode: props.mode,
        mapId: props.mapId,
        weapon: props.weapon,
        team: props.team,
        playerName: props.name,
        selfId: "local",
        botFill: true,
        onHud: props.onHud,
        onMatchEnd: props.onMatchEnd,
      });
      engineRef.current = engine;
      engine.start();
    });
    return () => { cancelled = true; engine?.dispose(); engineRef.current = null; };
  }, [props.mode, props.mapId, props.weapon, props.team, props.name, props.onHud, props.onMatchEnd]);

  const lock = () => {
    engineRef.current?.unlockAudio();
    if (touch) { setNeedClick(false); return; }
    canvasRef.current?.requestPointerLock();
    setNeedClick(false);
  };

  return (
    <div className="play">
      <canvas ref={canvasRef} />
      {needClick && !touch && (
        <button className="clickplay" onClick={lock}>Click to deploy</button>
      )}
      {touch && (
        <TouchPad
          onMove={(x, y) => engineRef.current?.setTouchMove(x, y)}
          onLook={(dx, dy) => engineRef.current?.addLook(dx, dy)}
          onFire={(v) => engineRef.current?.setTouchFire(v)}
          onJump={() => engineRef.current?.queueJump()}
        />
      )}
    </div>
  );
}

function TouchPad(props: { onMove: (x: number, y: number) => void; onLook: (dx: number, dy: number) => void; onFire: (v: boolean) => void; onJump: () => void; }) {
  const moveId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  return (
    <div className="touch"
      onPointerDown={(e) => {
        if (e.clientX < window.innerWidth * 0.45 && moveId.current == null) {
          moveId.current = e.pointerId; origin.current = { x: e.clientX, y: e.clientY };
        } else { lookId.current = e.pointerId; last.current = { x: e.clientX, y: e.clientY }; }
      }}
      onPointerMove={(e) => {
        if (e.pointerId === moveId.current) {
          const dx = (e.clientX - origin.current.x) / 46;
          const dy = (origin.current.y - e.clientY) / 46;
          const m = Math.hypot(dx, dy) || 1;
          const s = Math.min(1, m) / m;
          props.onMove(dx * s, dy * s);
        } else if (e.pointerId === lookId.current) {
          props.onLook(e.clientX - last.current.x, e.clientY - last.current.y);
          last.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerId === moveId.current) { moveId.current = null; props.onMove(0, 0); }
        if (e.pointerId === lookId.current) lookId.current = null;
      }}
    >
      <button className="tbtn jump" onPointerDown={(e) => { e.stopPropagation(); props.onJump(); }}>Jump</button>
      <button className="tbtn fire" onPointerDown={(e) => { e.stopPropagation(); props.onFire(true); }} onPointerUp={(e) => { e.stopPropagation(); props.onFire(false); }}>Fire</button>
    </div>
  );
}

function Hud(props: { hud: HudState; muted: boolean; onMuted: (v: boolean) => void; onLeave: () => void }) {
  const { hud } = props;
  return (
    <div className="hud">
      <div className="top">
        <div className="feed">{hud.feed.map((f) => <p key={f.id}>{f.text}</p>)}</div>
        <div className="score">
          <span className="red">{Math.floor(hud.scores.red)}</span>
          <span>{formatTime(hud.timeLeft)}</span>
          <span className="blue">{Math.floor(hud.scores.blue)}</span>
          <p>{MODE_LABEL[hud.mode]} · {hud.mapName}</p>
        </div>
        <button onClick={() => { props.onMuted(!props.muted); window.__pulseArena?.setMuted?.(!props.muted); }}>{props.muted ? "Sound" : "Mute"}</button>
      </div>
      <div className="cross">+</div>
      {hud.countdown > 0 && <p className="count">{hud.message}</p>}
      {!hud.alive && <p className="count">Tagged · {hud.respawnIn.toFixed(1)}s</p>}
      <div className="bottom">
        <div className="hp"><i style={{ width: `${hud.hp}%` }} /></div>
        <div className="ammo">
          <span>{Math.round(hud.hp)} HP</span>
          <span>{hud.weaponName}</span>
          <span>{hud.reloading ? "RELOAD" : `${hud.ammo} / ${hud.reserve}`}</span>
        </div>
      </div>
      {hud.paused && (
        <div className="overlay">
          <div className="panel">
            <h2>Paused</h2>
            <button className="deploy" onClick={() => window.__pulseArena?.setPaused?.(false)}>Resume</button>
            <button onClick={props.onLeave}>Leave match</button>
          </div>
        </div>
      )}
    </div>
  );
}
