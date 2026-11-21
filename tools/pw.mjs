// Playwright from the Rdw project, so this folder needs no own node_modules.
// Set PLAYWRIGHT_DIR to use another installation.
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const dir = process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), 'Rdw_Datenbasis', 'client', 'node_modules', 'playwright');
const require = createRequire(import.meta.url);
const pw = require(dir);
export const { devices } = pw;
// WebKit has no --mute-audio: every page gets an AudioContext whose output is silenced before the game loads
const SILENCE = () => {
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Base = window[name];
    if (!Base) continue;
    window[name] = class extends Base {
      constructor(...a) { super(...a); const g = Base.prototype.createGain.call(this); g.gain.value = 0; g.connect(super.destination); this._mute = g; }
      get destination() { return this._mute || super.destination; }
    };
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
};
const silentWebkitBrowser = (b) => {
  const newContext = b.newContext.bind(b);
  b.newContext = async (o) => { const c = await newContext(o); await c.addInitScript(SILENCE); return c; };
  b.newPage = async (o) => (await b.newContext(o)).newPage();
  return b;
};
export const webkit = new Proxy(pw.webkit, {
  get: (t, k) => (k === 'launch' ? async (o) => silentWebkitBrowser(await t.launch(o)) : (typeof t[k] === 'function' ? t[k].bind(t) : t[k])),
});
// test browsers stay silent: the game music must not play through the speakers while tools run
const MUTE = '--mute-audio';
const muted = (o = {}) => ({ ...o, args: [...(o.args || []).filter((a) => a !== MUTE), MUTE] });
const wrap = {
  launch: (o) => pw.chromium.launch(muted(o)),
  launchPersistentContext: (dir, o) => pw.chromium.launchPersistentContext(dir, muted(o)),
};
export const chromium = new Proxy(pw.chromium, {
  get: (t, k) => wrap[k] || (typeof t[k] === 'function' ? t[k].bind(t) : t[k]),
});
