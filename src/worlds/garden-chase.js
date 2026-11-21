// Garden party (see garden-base.js): Lotta steals a sausage, the chase, and the quiet chat between Naike and Mimo after it.
//    6-9   Mimo hops over to Ole at the grill; Ole turns round, waves, bends down to him: "Na, Mimo? Hast du Hunger?"
//    9-12  behind Ole's back Lotta strolls off, turns, and sneaks up to the grill in four tiptoe steps, low, nose down,
//          freezing between them; Mimo sees it and peeps a warning that Ole does not understand
//   12-13  she rears up at the grill and snaps the right sausage (from then on it is in her mouth, the grill has two)
//   13-16  she sits, wags and looks the other way (♪), then tiptoes off; Ole turns back, counts "Eins, zwei …",
//          looks at Lotta, back at the grill, at Lotta again: "Hey! Lotta!"
//   16-21  Lotta dashes out on the right; Ole (arms flailing), Mats (bouncing), Mimo (hopping) and, as she flies past
//          him, Caspar run after her
//   20-24  Lotta trots back in on the left first, proudly, lies down at her place and eats ("Mampf!"); the others come
//          in after her out of breath (Caspar runs on home, last)
//   24-26  Ole: "Na gut … dann eben das nächste." He takes a new one from the cool box and puts it on the grill (zisch)
// Lotta's moves use the engine's dog extras: y (her feet, into the depth of the lawn), rear (up on her hind legs) and the
// 'grab' pose while walking (low, nose down).
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;
  // a raw sausage in Ole's hand (the hand at 0,0, the tip up)
  G.addProp('redbeard', 'wurst', '<g transform="rotate(-18)"><rect x="-1.8" y="-9.4" width="3.6" height="10.4" rx="1.8" fill="#E8A08A" stroke="#B5705C" stroke-width="0.55"/><path d="M-0.6 -7.6 L-0.6 -1.4" stroke="#F6C3B2" stroke-width="0.8" stroke-linecap="round"/></g>');

  // where Lotta stands to reach the right sausage (her mouth on it when she is up), and the cool box beside the grill
  const DX = 133, DY = 176.5, UP = 0.645, BOX = { x: 62, y: 170 };
  const SNAP = 12.5, BACKOUT = 25.9;   // the sausage leaves the grill; a new one lies on it again
  const FED = [21.9, 22.75, 23.45], LIE = 118;     // her three bites
  const SQ = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

  G.act({
    name: 'chase', span: [6, 26],
    x: {
      // the chase: everyone runs out on the right, quicker once they are out of the picture, and comes back in on the left
      mimo: [[6.0, H.mimo], [7.7, 54], [16.9, 54], [17.4, 84, 'in'], [20.4, 600, 'lin'], [20.7, 760, 'lin'], [20.71, -200], [21.0, -60, 'lin'], [22.9, 72, 'out'], [24.7, 72], [25.8, H.mimo]],
      redbeard: [[16.6, H.redbeard], [17.2, 118, 'in'], [20.5, 600, 'lin'], [20.8, 760, 'lin'], [20.81, -200], [21.1, -60, 'lin'], [23.0, 100, 'out'], [24.5, 100], [24.9, 80], [25.3, 80], [25.8, H.redbeard]],
      kid: [[16.8, H.kid], [17.3, 180, 'in'], [20.1, 600, 'lin'], [20.4, 760, 'lin'], [20.41, -200], [20.7, -60, 'lin'], [22.4, H.kid, 'out']],
      sidepart: [[17.9, H.sidepart], [18.4, 395, 'in'], [19.8, 600, 'lin'], [20.1, 760, 'lin'], [20.11, -200], [22.2, -60, 'lin'], [24.4, 330, 'lin'], [25.0, H.sidepart, 'out']],
      // Lotta: strolls off, sneaks back in steps, steals, tiptoes away, dashes; back in from the left, lies down to eat
      dog: [[8.9, H.dog], [9.7, 170], [10.3, 170],
        [10.6, 162], [10.85, 162], [11.15, 154], [11.4, 154], [11.7, 147], [11.85, 147], [12.1, DX],
        [14.0, DX], [14.35, 150], [14.6, 150], [14.95, 160], [15.2, 160], [15.55, 170],
        [16.35, 170], [16.85, 222, 'in'], [18.95, 600, 'lin'], [19.25, 760, 'lin'], [19.26, -200], [19.55, -60, 'lin'], [21.2, LIE, 'out'], [25.0, LIE], [25.6, H.dog]],
    },
    pose: {
      // Ole: grilling; turns to Mimo, waves, bends down to him; turns back, counts, double take, runs flailing
      redbeard: [[7.4, null, 0, -1], [7.9, 'wave', 0, -1], [9.2, null, 0, -1], [9.5, 'pat', -1, -1], [11.7, null, 0, -1],
        [13.6, null, 0, 1], [13.95, 'point', 1, 1], [15.05, null, 0, 1], [15.85, 'flail', 0, 1], [20.6, null, 0, 0],
        [23.0, null, 0, 1], [24.85, 'pat', -1, -1], [25.35, 'pat', 1, 1]],
      kid: [[12.5, null, 0, 0, 'wow'], [14.2, null, 0, 0], [16.0, 'hooray', 0, 0, 'wow'], [17.2, null, 0, 0], [22.5, 'hooray', 0, 0, 'wow'], [23.7, null]],
      striped: [[16.7, 'applaud'], [18.9, null], [21.9, 'applaud'], [23.4, null]],
      sidepart: [[17.55, 'flinch']],
    },
    hold: { redbeard: [[25.1, 'wurst', 'r'], [BACKOUT, null]] },
    lines: [
      [7.8, 'mimo', 'Piep!', 1.45],
      [9.35, 'redbeard', 'Na, Mimo? Hast du Hunger?', 2.65],
      [12.05, 'mimo', 'Piep! Piep!', 1.95],
      [14.05, 'redbeard', 'Eins, zwei …', 2.0],
      [16.1, 'redbeard', 'Hey! Lotta!', 1.95],
      [23.4, 'redbeard', 'Na gut … dann eben das nächste.', 2.95],
    ],
    // the camera: the grill from the start; it runs with Lotta to the right end, waits there till everyone is out, and
    // comes back for her return on the left
    focus: [[6.0, 108], [13.9, 108], [15.4, 122], [16.2, 122], [17.3, 290], [18.5, 300], [19.7, 118], [26.0, 120]],
    sounds: [[7.8, 'piep'], [10.35, 'tapp'], [10.9, 'tapp2'], [11.45, 'tapp'], [11.9, 'tapp2'], [SNAP, 'schnapp'], [13.3, 'pfeif'],
      [15.6, 'huch'], [16.35, 'whoosh'], [17.6, 'boing'], [FED[0], 'mampf'], [FED[1], 'mampf'], [FED[2], 'schluck'], [23.0, 'hechel'], [BACKOUT, 'zisch']],
    figure(k, t, A) {
      const w = k.who, dog = A.dogX - k.x, grill = GD.GRILL.x - k.x;
      if (w === 'redbeard') {
        if (A.inn(t, 13.6, 15.3) || A.inn(t, 15.55, 15.8)) return { look: grill };
        if (A.inn(t, 15.3, 15.55) || A.inn(t, 15.8, 20.6) || A.inn(t, 23.0, 24.5)) return { look: dog };
        if (A.inn(t, 24.5, 26)) return { look: t < 25.3 ? BOX.x - k.x : grill };
        return null;
      }
      if (w === 'kid') {
        if (A.inn(t, 17.3, 20.9)) return { look: dog, hop: Math.abs(Math.sin(t * 11)) * 3 };
        return A.inn(t, 9.0, 26) ? { look: dog } : null;
      }
      if (w === 'striped' || w === 'reporter' || w === 'filmer') return A.inn(t, 11.8, 25) ? { look: dog } : null;
      if (w === 'sidepart') return A.inn(t, 16.5, 25) ? { look: dog } : null;
      return null;
    },
    dog(t, A) {
      const o = { pose: 'sit', dir: 1, lookAt: null };
      if (t < 6.3 || t >= 26) return null;
      if (t < 8.6) { o.dir = -1; o.lookAt = GD.GRILL.x - A.dogX; o.happy = 0.35; }   // the smell of the grill
      else if (t < 10.0) { o.pose = t < 9.7 ? 'grab' : 'sniff'; o.dir = 1; }         // strolls off, nose on the lawn
      else if (t < 10.25) { o.pose = 'stand'; o.dir = 1; o.lookAt = -40; }           // a look back at Ole
      else if (t < 12.1) { o.pose = 'grab'; o.dir = -1; o.lookAt = H.redbeard - A.dogX; }   // the sneak
      else if (t < 13.25) { o.pose = 'stand'; o.dir = -1; o.lookAt = -30; o.rear = A.at([[12.1, 0], [12.42, UP, 'out'], [12.85, UP], [13.2, 0, 'in']], t); }
      else if (t < 14.0) { o.pose = 'sit'; o.dir = 1; o.lookAt = t < 13.6 ? 40 : -40; o.happy = 0.5; }   // who, me?
      else if (t < 15.6) { o.pose = 'grab'; o.dir = 1; }                                // tiptoes off with it
      else if (t < 16.35) { o.pose = 'stand'; o.dir = 1; o.lookAt = -40; if (t > 16.05) o.jump = 0.45; }   // caught!
      else if (t < 21.2) { o.pose = 'stand'; o.dir = 1; }
      else if (t < 23.5) { o.pose = 'lie'; o.dir = 1; o.lookAt = 30; o.happy = t > FED[2] ? 1 : 0.4; }
      else if (t < 25.0) { o.pose = 'lie'; o.dir = 1; o.lookAt = -30; o.happy = 0.6; }
      // her feet: into the lawn towards the grill while she sneaks, back out when she leaves
      o.y = A.at([[9.7, GD.FRONT + 4], [10.3, GD.FRONT + 4], [12.1, DY], [14.0, DY], [15.0, GD.FRONT + 2], [15.55, GD.FRONT + 4]], t);
      // the sausage: in her mouth from the snap until the last bite; level as it lay on the grill, then it turns with her head
      if (t >= SNAP && t < FED[2]) {
        const left = t < FED[0] ? 1 : t < FED[1] ? 0.62 : 0.3, rear = o.rear || 0;
        const turn = A.REAR * rear * SQ(SNAP + 0.45 - t, 0, 0.45);   // undo her tilt at first
        o.carry = 'sausage';
        o.carryDraw = (g, cx, cy) => { g.save(); g.translate(cx, cy); g.rotate(turn); g.scale(left, 1); A.sausage(g, 0, 0, 0); g.restore(); };
      }
      return o;
    },
    mimo(t, A) {
      if (t < 7.7 || t >= 26 || A.inn(t, 16.9, 22.9)) return null;   // running: the engine hops him along
      // on his way home he hops right over Lotta
      if (A.inn(t, 24.7, 25.8)) { const d = Math.abs(A.mimoX - LIE); return d < 26 ? { hop: Math.cos(d / 26 * Math.PI / 2) * 22 } : null; }
      const o = { face: 1, mood: null, hop: 0 };
      const bounce = (a, d, h) => (A.inn(t, a, a + d) ? Math.sin((t - a) / d * Math.PI) * h : 0);
      if (t < 9.3) { o.mood = t < 8.4 ? 'piep' : 'happy'; o.hop = bounce(7.8, 0.4, 9); }
      else if (t < 10.7) o.mood = 'happy';                                // Ole pats him
      else if (t < 12.05) o.mood = 'scared';                              // he sees Lotta sneak
      else if (t < 14.0) { o.mood = 'piep'; o.hop = bounce(12.1, 0.38, 10) + bounce(12.6, 0.38, 10) + bounce(13.1, 0.38, 7); }
      else if (t < 15.8) o.mood = t > 15.2 ? 'scared' : null;
      else if (t < 16.9) { o.mood = 'scared'; o.hop = bounce(16.15, 0.35, 8); }
      else { o.face = 1; o.mood = 'happy'; o.hop = bounce(22.95, 0.3, 4); }   // out of breath, beside Lotta
      return o;
    },
    grill(t) { return t >= SNAP && t < BACKOUT ? 2 : null; },
    // the cool box with the sausages for later, beside the grill (there all the time)
    back(c, t, A) {
      const p = A.pal, dark = p.ink === '#1F1E2C', x = BOX.x, y = BOX.y;
      c.fillStyle = 'rgba(58,56,80,0.12)'; c.beginPath(); c.ellipse(x, y + 0.5, 10, 1.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = dark ? '#4F86A8' : '#7FC4E8'; c.strokeStyle = dark ? '#2F5470' : '#4A8AB0'; c.lineWidth = 0.7;
      c.beginPath(); c.roundRect ? c.roundRect(x - 9, y - 11, 18, 11, 1.6) : c.rect(x - 9, y - 11, 18, 11); c.fill(); c.stroke();
      c.fillStyle = dark ? '#C9CDD8' : '#FFFFFF'; c.beginPath(); c.roundRect ? c.roundRect(x - 10, y - 14, 20, 3.6, 1.4) : c.rect(x - 10, y - 14, 20, 3.6); c.fill(); c.stroke();
      c.fillStyle = dark ? '#2F5470' : '#4A8AB0'; c.fillRect(x - 3, y - 16, 6, 1.4);
    },
    front(c, t, A) {
      // a puff of dust where she dashes off
      if (A.inn(t, 16.35, 17.1)) {
        const k = SQ(t, 16.35, 17.1);
        c.fillStyle = A.pal.smoke; c.globalAlpha = 0.55 * (1 - k);
        for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(170 - i * 5 - k * 8, GD.FRONT + 2 - i * 1.5 - k * 3, 2.5 + k * 4 + i * 0.6, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = 1;
      }
    },
    after(c, k, t, A) {
      // out of breath: little puffs at the mouth of the ones who ran
      const at = { redbeard: 23.0, kid: 22.4 }[k.who];
      if (at == null || !A.inn(t, at, at + 1.6) || !k.p) return;
      const h = A.head(k);
      c.fillStyle = A.pal.smoke;
      for (let i = 0; i < 3; i++) { const q = ((t - at) * 1.6 + i / 3) % 1; c.globalAlpha = 0.7 * (1 - q); c.beginPath(); c.arc(h[0] + 6 + q * 6, h[1] + 2 - q * 4, 1.2 + q * 1.6, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    },
    talk(c, t, A) {
      const m = A.dogMouth(), R = A.who('redbeard');
      A.pop(c, 'Schnapp!', GD.GRILL.x + 18, GD.GRILL.y - 44, (t - SNAP) / 0.8, -0.1, 11);
      A.pop(c, '♪', m[0] + 8, m[1] - 14, (t - 13.3) / 0.7, 0.15, 11);
      A.pop(c, '♫', m[0] + 13, m[1] - 20, (t - 13.65) / 0.7, -0.1, 11);
      if (R) { const h = A.head(R); A.pop(c, '!', h[0] + 13, h[1] - 6, (t - 15.8) / 0.55, 0.15, 13, '#FFE08F'); }
      A.pop(c, 'Mampf!', A.dogX - 6, A.dogY - 30, (t - FED[0]) / 0.8, -0.1, 12);
      A.pop(c, 'Mampf!', A.dogX - 2, A.dogY - 34, (t - FED[1]) / 0.7, 0.08, 10);
      A.pop(c, 'Zisch!', GD.GRILL.x + 4, GD.GRILL.y - 40, (t - BACKOUT) / 0.8, -0.08, 11);
    },
  });
  // the quiet part after the chase: Naike interviews Mimo about it, Ulrike films
  G.act({
    name: 'interview', span: [26.4, 31.6],
    pose: { reporter: [[26.6, 'offer', 1, 1], [31.2, 'mic', 0, 1]] },
    lines: [[26.9, 'reporter', 'Mimo, wie war die Wurst-Jagd?', 2.85], [29.9, 'mimo', 'Piep!', 1.45]],
    focus: [[26.6, 238], [31.4, 238]],
    sounds: [[29.9, 'piep']],
    figure(k, t, A) { return k.who === 'filmer' && A.inn(t, 26.4, 31.6) ? { look: A.mimoX - k.x } : null; },
    mimo(t, A) {
      if (!A.inn(t, 26.4, 31.6)) return null;
      const hop = A.inn(t, 29.9, 30.35) ? Math.sin((t - 29.9) / 0.45 * Math.PI) * 10 : 0;
      return { face: -1, mood: A.inn(t, 29.9, 30.5) ? 'piep' : 'happy', hop };
    },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
