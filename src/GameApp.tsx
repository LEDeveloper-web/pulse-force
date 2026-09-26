import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaEngine } from "./game/engine";
import { MAP_LIST, type MapId } from "./game/maps";
import { WEAPON_ORDER, WEAPONS, type WeaponId } from "./game/weapons";
import { MODE_BLURB, MODE_LABEL, type GameMode, type HudState, type Team } from "./game/types";
import { loadProfile, payout, rankFor, saveProfile, type Profile } from "./game/profile";

const MODES: GameMode[] = ["tdm", "ffa", "ctf", "koth", "dom", "hp", "gg", "inf"];
const NAMES = ["Ranger", "Scout", "Vesper", "Comet", "Quill", "Harbor", "Nimbus", "Atlas"];
type Tab = "play" | "shop" | "armory" | "settings";

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
  const [tab, setTab] = useState<Tab>("play");
  const [mode, setMode] = useState<GameMode>("tdm");
  const [mapId, setMapId] = useState<MapId>("hall");
  const [team, setTeam] = useState<Team>("red");
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window === "undefined") {
      return {
        name: randomName(),
        credits: 420,
        xp: 0,
        owned: ["rifle", "pistol"],
        primary: "rifle",
        secondary: "pistol",
        lookScale: 1.15,
        invertY: false,
        muted: false,
      };
    }
    const p = loadProfile();
    if (p.name === "Ranger-01") p.name = randomName();
    return p;
  });
  const [hud, setHud] = useState<HudState | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [reward, setReward] = useState<{ credits: number; xp: number } | null>(null);
  const [matchId, setMatchId] = useState(0);
  const [shopMsg, setShopMsg] = useState("");

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const patch = (partial: Partial<Profile>) => setProfile((p) => ({ ...p, ...partial }));

  const startSolo = () => {
    setWinner(null);
    setReward(null);
    setMatchId((n) => n + 1);
    setPhase("playing");
  };

  const onMatchEnd = useCallback((w: string) => {
    setWinner(w);
    setPhase("results");
  }, []);

  useEffect(() => {
    if (phase !== "results" || !hud || reward) return;
    const me = hud.board.find((b) => !b.bot);
    const won = !!winner && winner !== "Draw" && (winner === me?.name || winner.toLowerCase().includes(team));
    const pay = payout(Math.floor(hud.personal), won);
    setReward(pay);
    setProfile((p) => ({ ...p, credits: p.credits + pay.credits, xp: p.xp + pay.xp }));
  }, [phase, hud, reward, winner, team]);

  const buy = (id: WeaponId) => {
    const item = WEAPONS[id];
    if (profile.owned.includes(id)) {
      setShopMsg("Already in armory.");
      return;
    }
    if (profile.credits < item.price) {
      setShopMsg("Not enough credits. Deploy to earn more.");
      return;
    }
    setProfile((p) => ({
      ...p,
      credits: p.credits - item.price,
      owned: [...p.owned, id],
    }));
    setShopMsg(`${item.name} unlocked.`);
  };

  const equip = (id: WeaponId, slot: "primary" | "secondary") => {
    if (!profile.owned.includes(id)) return;
    setProfile((p) => {
      if (slot === "primary") {
        return { ...p, primary: id, secondary: p.secondary === id ? p.primary : p.secondary };
      }
      return { ...p, secondary: id, primary: p.primary === id ? p.secondary : p.primary };
    });
  };

  const rank = rankFor(profile.xp);

  return (
    <div className="shell">
      <div className="edge red" />
      <div className="edge blue" />
      {phase !== "menu" && (
        <PlayView
          key={matchId}
          mode={mode}
          mapId={mapId}
          team={team}
          name={profile.name}
          primary={profile.primary}
          secondary={profile.secondary}
          lookScale={profile.lookScale}
          invertY={profile.invertY}
          muted={profile.muted}
          onHud={setHud}
          onMatchEnd={onMatchEnd}
        />
      )}
      {phase === "menu" && (
        <div className="hq">
          <header className="topbar">
            <div>
              <p className="kicker">Special Forces Group</p>
              <h1>PULSE FORCE</h1>
            </div>
            <div className="stats">
              <div>
                <span>Credits</span>
                <b>{profile.credits}</b>
              </div>
              <div>
                <span>{rank.current.name}</span>
                <b>XP {profile.xp}</b>
              </div>
            </div>
          </header>
          <div className="xpbar"><i style={{ width: `${Math.round(rank.pct * 100)}%` }} /></div>

          {tab === "play" && (
            <section className="pane">
              <p className="lead">Pick a mode and map, then deploy. Guns come from the shop and armory.</p>
              <label>Callsign</label>
              <input value={profile.name} maxLength={16} onChange={(e) => patch({ name: e.target.value.slice(0, 16) })} />
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
              <div className="loadout-chip">
                Loadout · {WEAPONS[profile.primary].name} / {WEAPONS[profile.secondary].name}
                <button type="button" onClick={() => setTab("armory")}>Change</button>
              </div>
              <button className="deploy" onClick={startSolo}>Deploy Solo</button>
            </section>
          )}

          {tab === "shop" && (
            <section className="pane">
              <p className="lead">Spend credits on pulse weapons. Starter rifle and sidearm are free.</p>
              {shopMsg && <p className="muted">{shopMsg}</p>}
              <div className="shop">
                {WEAPON_ORDER.map((id) => {
                  const w = WEAPONS[id];
                  const owned = profile.owned.includes(id);
                  return (
                    <article key={id} className={cn("shop-card", owned && "owned")}>
                      <div>
                        <b>{w.name}</b>
                        <span>{w.className} · {w.damage} dmg · {w.mag} mag</span>
                        <p>{w.blurb}</p>
                      </div>
                      {owned ? (
                        <button disabled>Owned</button>
                      ) : (
                        <button onClick={() => buy(id)}>{w.price} cr</button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "armory" && (
            <section className="pane">
              <p className="lead">Equip two owned weapons. Switch in-match with 1 / 2 or Q.</p>
              <label>Primary</label>
              <div className="grid3">
                {profile.owned.map((id) => (
                  <button key={`p-${id}`} className={cn("card", profile.primary === id && "on")} onClick={() => equip(id, "primary")}>
                    <b>{WEAPONS[id].name}</b>
                    <span>{WEAPONS[id].className}</span>
                  </button>
                ))}
              </div>
              <label>Secondary</label>
              <div className="grid3">
                {profile.owned.map((id) => (
                  <button key={`s-${id}`} className={cn("card", profile.secondary === id && "on")} onClick={() => equip(id, "secondary")}>
                    <b>{WEAPONS[id].name}</b>
                    <span>{WEAPONS[id].className}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="pane">
              <p className="lead">Look speed was too slow. Default is now snappy like SFG2. Raise it more if you want.</p>
              <label>Look sensitivity {profile.lookScale.toFixed(2)}x</label>
              <input
                type="range"
                min={0.4}
                max={2.4}
                step={0.05}
                value={profile.lookScale}
                onChange={(e) => patch({ lookScale: Number(e.target.value) })}
              />
              <div className="row">
                <button className={cn("card", profile.invertY && "on")} onClick={() => patch({ invertY: !profile.invertY })}>
                  <b>{profile.invertY ? "Y inverted" : "Y normal"}</b>
                </button>
                <button className={cn("card", profile.muted && "on")} onClick={() => patch({ muted: !profile.muted })}>
                  <b>{profile.muted ? "Muted" : "Sound on"}</b>
                </button>
              </div>
              <p className="muted">Desktop: click arena, then mouse look. Phone: drag right side to look. WASD / stick to move.</p>
            </section>
          )}

          <nav className="tabs">
            {(["play", "shop", "armory", "settings"] as Tab[]).map((t) => (
              <button key={t} className={cn(tab === t && "on")} onClick={() => setTab(t)}>{t}</button>
            ))}
          </nav>
        </div>
      )}
      {phase === "playing" && hud && (
        <Hud hud={hud} muted={profile.muted} onMuted={(v) => patch({ muted: v })} onLeave={() => setPhase("menu")} />
      )}
      {phase === "results" && (
        <div className="overlay">
          <div className="panel">
            <p className="kicker">Match over</p>
            <h2>{winner ?? "Draw"}</h2>
            {reward && <p className="muted">+{reward.credits} credits · +{reward.xp} XP</p>}
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
              <button onClick={() => { setPhase("menu"); setTab("shop"); }}>Shop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayView(props: {
  mode: GameMode; mapId: MapId; team: Team; name: string;
  primary: WeaponId; secondary: WeaponId; lookScale: number; invertY: boolean; muted: boolean;
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
        weapon: props.primary,
        loadout: [props.primary, props.secondary],
        lookScale: props.lookScale,
        invertY: props.invertY,
        team: props.team,
        playerName: props.name,
        selfId: "local",
        botFill: true,
        onHud: props.onHud,
        onMatchEnd: props.onMatchEnd,
      });
      engineRef.current = engine;
      engine.start();
      window.__pulseArena?.setMuted?.(props.muted);
    });
    return () => { cancelled = true; engine?.dispose(); engineRef.current = null; };
  }, [props.mode, props.mapId, props.primary, props.secondary, props.lookScale, props.invertY, props.team, props.name, props.onHud, props.onMatchEnd]);

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
          onLook={(dx, dy) => engineRef.current?.addLook(dx, dy, true)}
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
          props.onLook((e.clientX - last.current.x) * 1.35, (e.clientY - last.current.y) * 1.35);
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
