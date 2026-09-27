import { useEffect, useRef, useState } from "react";
import type { ArenaEngine } from "./game/engine";
import type { MapId } from "./game/maps";
import { GEAR, SHOP_TABS, shopOf, type ShopTab, type WeaponId } from "./game/weapons";
import { MODE_LABEL, type GameMode, type HudState, type Team } from "./game/types";

function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function formatTime(s: number) { const t=Math.max(0,Math.ceil(s)); return `${Math.floor(t/60)}:${(t%60).toString().padStart(2,"0")}`; }

export function PlayView(props: { mode: GameMode; mapId: MapId; team: Team; name: string; primary: WeaponId; lookScale: number; invertY: boolean; muted: boolean; startMoney: number; botCount: number; onHud: (h: HudState)=>void; onMatchEnd: (w: string)=>void; }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const [needClick, setNeedClick] = useState(true);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setTouch(coarse || hasTouch);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let cancelled = false; let engine: ArenaEngine | null = null;
    void import("./game/engine").then(({ ArenaEngine }) => {
      if (cancelled || !canvasRef.current) return;
      engine = new ArenaEngine({ canvas: canvasRef.current, role: "solo", mode: props.mode, mapId: props.mapId, weapon: props.primary, lookScale: props.lookScale, invertY: props.invertY, startMoney: props.startMoney, team: props.team, playerName: props.name, selfId: "local", botFill: true, botCount: props.botCount, onHud: props.onHud, onMatchEnd: props.onMatchEnd });
      engineRef.current = engine; engine.start(); window.__pulseArena?.setMuted?.(props.muted);
    });
    return () => { cancelled = true; engine?.dispose(); engineRef.current = null; };
  }, [props.mode, props.mapId, props.primary, props.lookScale, props.invertY, props.team, props.name, props.startMoney, props.botCount, props.onHud, props.onMatchEnd]);
  const lock = () => { engineRef.current?.unlockAudio(); if (touch) { setNeedClick(false); return; } canvasRef.current?.requestPointerLock(); setNeedClick(false); };
  return (
    <div className="play">
      <canvas ref={canvasRef} />
      {needClick && !touch && <button className="clickplay" onClick={lock}>Click to deploy</button>}
      {touch && <TouchPad
        onMove={(x,y)=>engineRef.current?.setTouchMove(x,y)}
        onLook={(dx,dy)=>engineRef.current?.addLook(dx,dy)}
        onFire={(v)=>engineRef.current?.setTouchFire(v)}
        onJump={()=>engineRef.current?.queueJump()}
      />}
    </div>
  );
}

const STICK_R = 54;
const DEAD = 10;

function TouchPad(props: { onMove:(x:number,y:number)=>void; onLook:(dx:number,dy:number)=>void; onFire:(v:boolean)=>void; onJump:()=>void; }) {
  const moveId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const fireId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const moveFn = useRef(props.onMove);
  const fireFn = useRef(props.onFire);
  moveFn.current = props.onMove;
  fireFn.current = props.onFire;

  const haltMove = () => {
    moveId.current = null;
    moveFn.current(0, 0);
    setKnob({ x: 0, y: 0, on: false });
  };
  const haltLook = () => { lookId.current = null; };
  const haltFire = () => {
    fireId.current = null;
    fireFn.current(false);
  };

  useEffect(() => {
    const end = (e: PointerEvent) => {
      if (e.pointerId === moveId.current) haltMove();
      if (e.pointerId === lookId.current) haltLook();
      if (e.pointerId === fireId.current) haltFire();
    };
    const clear = () => { haltMove(); haltLook(); haltFire(); };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      clear();
    };
  }, []);

  const applyStick = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x;
    let dy = origin.current.y - clientY;
    const mag = Math.hypot(dx, dy);
    if (mag > STICK_R) {
      dx = (dx / mag) * STICK_R;
      dy = (dy / mag) * STICK_R;
    }
    setKnob({ x: dx, y: -dy, on: true });
    if (mag < DEAD) {
      moveFn.current(0, 0);
      return;
    }
    const nx = dx / STICK_R;
    const ny = dy / STICK_R;
    moveFn.current(nx, ny);
  };

  return (
    <div
      className="touch"
      onPointerDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest(".tbtn")) return;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
        const leftZone = e.clientX < window.innerWidth * 0.48;
        if (leftZone && moveId.current == null) {
          moveId.current = e.pointerId;
          origin.current = { x: e.clientX, y: e.clientY };
          applyStick(e.clientX, e.clientY);
        } else if (lookId.current == null) {
          lookId.current = e.pointerId;
          last.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId === moveId.current) applyStick(e.clientX, e.clientY);
        else if (e.pointerId === lookId.current) {
          const dx = e.clientX - last.current.x;
          const dy = e.clientY - last.current.y;
          last.current = { x: e.clientX, y: e.clientY };
          const cap = 28;
          props.onLook(Math.max(-cap, Math.min(cap, dx)), Math.max(-cap, Math.min(cap, dy)));
        }
      }}
    >
      <div className={cn("stick", knob.on && "on")} style={{ transform: knob.on ? `translate(${origin.current.x - 60}px, ${origin.current.y - 60}px)` : undefined }}>
        <i style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <button
        className="tbtn jump"
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); props.onJump(); }}
      >Jump</button>
      <button
        className="tbtn fire"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          fireId.current = e.pointerId;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          props.onFire(true);
        }}
        onPointerUp={(e) => { e.stopPropagation(); if (e.pointerId === fireId.current) haltFire(); }}
        onPointerCancel={(e) => { e.stopPropagation(); if (e.pointerId === fireId.current) haltFire(); }}
      >Fire</button>
    </div>
  );
}

export function Hud(props: { hud: HudState; muted: boolean; buyOpen: boolean; shopTab: ShopTab; onShopTab:(t:ShopTab)=>void; onBuy:(id:string)=>void; onToggleBuy:()=>void; onMuted:(v:boolean)=>void; onMenu:()=>void; onLeave:()=>void; }) {
  const { hud } = props;
  return (
    <div className="hud">
      <div className="top">
        <div className="feed">{hud.feed.map((f)=><p key={f.id}>{f.text}</p>)}</div>
        <div className="score"><span className="red">{Math.floor(hud.scores.red)}</span><span>{formatTime(hud.timeLeft)}</span><span className="blue">{Math.floor(hud.scores.blue)}</span><p>{MODE_LABEL[hud.mode]} · {hud.mapName}</p></div>
        <div className="hud-right"><span className="cash">${hud.money}</span><button onClick={()=>{props.onMuted(!props.muted); window.__pulseArena?.setMuted?.(!props.muted);}}>{props.muted?"Sound":"Mute"}</button><button onClick={props.onMenu}>Menu</button></div>
      </div>
      <div className="cross">+</div>
      {hud.countdown>0 && <p className="count">{hud.message}</p>}
      {!hud.alive && <p className="count">{hud.respawnIn>0?`Tagged · ${hud.respawnIn.toFixed(1)}s`:"Out this round"}</p>}
      <button className="buyfab" onClick={props.onToggleBuy}>BUY</button>
      <div className="bottom"><div className="hp"><i style={{width:`${Math.min(100,hud.hp)}%`}} /></div><div className="ammo"><span>{Math.round(hud.hp)} HP{hud.vest?` · vest ${hud.vest}`:""}</span><span>{hud.weaponName}</span><span>{hud.reloading?"RELOAD":`${hud.ammo} / ${hud.reserve}`}</span></div></div>
      {props.buyOpen && (
        <div className="shopui">
          <div className="shopui-head"><b>Shop</b><span>${hud.money}</span><button onClick={props.onToggleBuy}>Close</button></div>
          <div className="shopui-tabs">{SHOP_TABS.map((t)=>(<button key={t.id} className={cn(props.shopTab===t.id && "on")} onClick={()=>props.onShopTab(t.id)}>{t.label}</button>))}</div>
          <div className="shopui-list">
            {props.shopTab==="gear" ? GEAR.map((g)=>(<button key={g.id} onClick={()=>props.onBuy(g.id)}><b>{g.name}</b><span>${g.price}</span></button>))
              : shopOf(props.shopTab).map((w)=>(<button key={w.id} disabled={hud.money<w.price && w.price>0} onClick={()=>props.onBuy(w.id)}><b>{w.name}</b><span>${w.price}</span></button>))}
          </div>
        </div>
      )}
    </div>
  );
}
