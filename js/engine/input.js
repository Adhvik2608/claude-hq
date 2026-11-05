// Keyboard, mouse-drag look, wheel zoom and touch (virtual stick + look drag).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();     // keys pressed this frame
    this.look = { dx: 0, dy: 0 };
    this.zoom = 0;
    this.stick = { x: 0, y: 0, active: false };
    this.touchRun = false;
    this.touchJump = false;
    this.touchAct = false;
    this.enabled = true;          // false while typing in panels
    this.dragging = false;
    this._bind();
  }

  _bind() {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.code;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
      this.onKey && this.onKey(k, e);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.onKeyUp && this.onKeyUp(e.code, e); });
    addEventListener('blur', () => this.keys.clear());

    const c = this.canvas;
    let last = null;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      this.dragging = true; last = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (document.pointerLockElement === c) { this.look.dx += e.movementX; this.look.dy += e.movementY; return; }
      if (!this.dragging || !last) return;
      this.look.dx += e.clientX - last.x; this.look.dy += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
    });
    const up = (e) => { if (e.pointerType === 'touch') return; this.dragging = false; last = null; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60); e.preventDefault(); }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    // touch look: any touch on the canvas that is not on the stick
    const touches = new Map();
    c.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }, { passive: true });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const p = touches.get(t.identifier);
        if (!p) continue;
        this.look.dx += (t.clientX - p.x) * 1.4; this.look.dy += (t.clientY - p.y) * 1.4;
        p.x = t.clientX; p.y = t.clientY;
      }
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (this._pinch) this.zoom += (this._pinch - d) / 40;
        this._pinch = d;
      }
    }, { passive: true });
    c.addEventListener('touchend', (e) => { for (const t of e.changedTouches) touches.delete(t.identifier); this._pinch = null; }, { passive: true });
  }

  bindTouchUI({ stick, knob, jump, run, act }) {
    if (!stick) return;
    let id = null, cx = 0, cy = 0;
    const R = 52;
    const move = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = dx / R; this.stick.y = dy / R; this.stick.active = true;
      this.touchRun = d > R * 0.98 && this.touchRunLatch;
    };
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId; const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      stick.setPointerCapture(id); move(e.clientX, e.clientY);
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e.clientX, e.clientY); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.stick.x = this.stick.y = 0; this.stick.active = false; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    jump.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pressed.add('Space'); });
    act.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pressed.add('KeyE'); this.onKey && this.onKey('KeyE', e); });
    run.addEventListener('pointerdown', (e) => { e.preventDefault(); this.touchRunLatch = !this.touchRunLatch; run.classList.toggle('on', this.touchRunLatch); });
  }

  down(code) { return this.enabled && this.keys.has(code); }
  hit(code) { return this.enabled && this.pressed.has(code); }

  moveAxis() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.stick.active) { x += this.stick.x; y -= this.stick.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  sprinting() { return this.enabled && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchRunLatch); }

  consumeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = 0; return l; }
  consumeZoom() { const z = this.zoom; this.zoom = 0; return z; }
  endFrame() { this.pressed.clear(); }
}
