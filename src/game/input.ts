const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyR",
  "KeyE",
  "KeyQ",
  "KeyB",
  "KeyC",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Escape",
]);

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class GameInput {
  keys = new Set<string>();
  injected: string[] | null = null;
  lookDX = 0;
  lookDY = 0;
  fireHeld = false;
  touchMoveX = 0;
  touchMoveY = 0;
  invertY = false;
  scale = 1;
  sens = 1;
  mouseSens = 0.0064;
  touchSens = 0.0092;
  padSens = 0.085;
  locked = false;
  queuedJump = false;

  moveX = 0;
  moveY = 0;
  jump = false;
  fire = false;
  sprint = false;
  reload = false;
  pause = false;
  slot = 0;
  nextWeapon = false;
  touchSprint = false;
  queuedReload = false;

  private prevJump = false;
  private prevReload = false;
  private prevPause = false;
  private prevFire = false;
  private prevNext = false;
  private prevBuy = false;
  jumpPressed = false;
  reloadPressed = false;
  pausePressed = false;
  firePressed = false;
  nextPressed = false;
  buyPressed = false;
  buy = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      return;
    }
    this.keys.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.fireHeld = false;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.lookDX = 0;
    this.lookDY = 0;
    this.touchSprint = false;
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    const k = this.mouseSens * this.scale;
    this.lookDX += e.movementX * k;
    this.lookDY += e.movementY * k;
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.fireHeld = true;
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.fireHeld = false;
  };
  private onLock = () => {
    this.locked = document.pointerLockElement != null;
  };

  attach(target: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    document.addEventListener("pointerlockchange", this.onLock);
    target.addEventListener("mousemove", this.onMouseMove);
    target.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  detach(target: HTMLElement) {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onLock);
    target.removeEventListener("mousemove", this.onMouseMove);
    target.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  setKeys(codes: string[]) {
    this.injected = codes;
  }

  setLookSettings(scale: number, invertY: boolean) {
    this.scale = Math.max(0.35, Math.min(2.6, scale));
    this.invertY = invertY;
  }

  addLook(dx: number, dy: number, touch = true) {
    const k = (touch ? this.touchSens : this.mouseSens) * this.scale;
    this.lookDX += dx * k;
    this.lookDY += dy * k;
  }

  sampleLook() {
    const dx = this.lookDX;
    const dy = this.lookDY * (this.invertY ? -1 : 1);
    this.lookDX = 0;
    this.lookDY = 0;
    return { dx, dy };
  }

  update() {
    this.prevJump = this.jump;
    this.prevReload = this.reload;
    this.prevPause = this.pause;
    this.prevFire = this.fire;
    this.prevNext = this.nextWeapon;
    this.prevBuy = this.buy;

    const keys = this.injected ? new Set(this.injected) : this.keys;
    const stick = radialDeadzone(this.touchMoveX, this.touchMoveY, 0.12);
    let mx = stick.x;
    let my = stick.y;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my -= 1;

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    let padFire = false;
    let padJump = false;
    let padSprint = false;
    let padReload = false;
    let padPause = false;
    if (pads) {
      for (const pad of pads) {
        if (!pad || pad.mapping !== "standard") continue;
        const ls = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        mx += ls.x;
        my -= ls.y;
        const rs = radialDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.1);
        this.lookDX += rs.x * this.padSens * this.scale;
        this.lookDY += rs.y * this.padSens * this.scale;
        if (pad.buttons[7]?.value > 0.35) padFire = true;
        if (pad.buttons[0]?.pressed) padJump = true;
        if (pad.buttons[6]?.value > 0.4) padSprint = true;
        if (pad.buttons[2]?.pressed) padReload = true;
        if (pad.buttons[9]?.pressed) padPause = true;
      }
    }

    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    this.moveX = mx;
    this.moveY = my;
    this.jump = keys.has("Space") || padJump || this.queuedJump;
    this.queuedJump = false;
    this.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || padSprint || this.touchSprint;
    this.reload = keys.has("KeyR") || padReload || this.queuedReload;
    this.queuedReload = false;
    this.pause = keys.has("Escape") || padPause;
    this.buy = keys.has("KeyB");
    this.nextWeapon = keys.has("KeyQ") || keys.has("KeyE");
    if (keys.has("Digit1")) this.slot = 1;
    else if (keys.has("Digit2")) this.slot = 2;
    else if (keys.has("Digit3")) this.slot = 3;
    else if (keys.has("Digit4")) this.slot = 4;
    else this.slot = 0;
    this.fire = this.fireHeld || padFire || (this.injected ? this.injected.includes("Mouse0") : false);

    this.jumpPressed = this.jump && !this.prevJump;
    this.reloadPressed = this.reload && !this.prevReload;
    this.pausePressed = this.pause && !this.prevPause;
    this.firePressed = this.fire && !this.prevFire;
    this.nextPressed = this.nextWeapon && !this.prevNext;
    this.buyPressed = this.buy && !this.prevBuy;
  }
}
