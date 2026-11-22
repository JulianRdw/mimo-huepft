/* Mimo hüpft · Kinderzimmer (3D) · time of day
   The room goes from afternoon to evening to night as Mimo gets on. A mood is a set of light colours
   and strengths; the room fades slowly from one to the next. At night two small lamps help: the night
   light in the socket and a soft glow around Mimo, so he never stands in the dark. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // sky/ground: light from above and below. sun: the light through the window (moonlight at night).
  // env: how strongly glossy things mirror the bright room. wallGlow: how much the walls shine by themselves. patch: window light on the floor. glow: night lamps and glow stars.
  const MOODS = {
    day: { haze: '#F1DCC0', sky: '#FFF3DC', ground: '#B48A62', skyPower: 1.1, sun: '#FFDDB0', sunPower: 2.2, wallGlow: 0.42, patch: 0.22, patchColor: '#FFFFFF', pane: '#FFF6DF', dust: 0.45, glow: 0, env: 1 },
    evening: { haze: '#EFB98C', sky: '#FFD7AE', ground: '#A66F58', skyPower: 0.9, sun: '#FF9658', sunPower: 2.0, wallGlow: 0.34, patch: 0.3, patchColor: '#FFB070', pane: '#FFC58A', dust: 0.5, glow: 0.12, env: 0.8 },
    night: { haze: '#262E4D', sky: '#8090CC', ground: '#2C3150', skyPower: 0.62, sun: '#9BB2F0', sunPower: 0.8, wallGlow: 0.1, patch: 0.1, patchColor: '#8FA8FF', pane: '#2B3966', dust: 0.08, glow: 1, env: 0.4 },
  };
  const FADE_RATE = 0.7;                       // how fast one mood turns into the next
  const NIGHT_LIGHT = { color: '#FFD98A', power: 260, reach: 60 }, MIMO_LIGHT = { color: '#FFF1D0', power: 8, reach: 12, up: 2.4 };
  const COLORS = ['haze', 'sky', 'ground', 'sun', 'patchColor', 'pane'], NUMBERS = ['skyPower', 'sunPower', 'wallGlow', 'patch', 'dust', 'glow', 'env'];

  function makeMood(THREE, deps) {
    const { scene, hemi, sun, decorApi, nightLightAt, kit } = deps, { damp } = Room3D.util;
    const now = {}, goal = {};
    for (const key of COLORS) { now[key] = new THREE.Color(MOODS.day[key]); goal[key] = new THREE.Color(); }
    for (const key of NUMBERS) now[key] = MOODS.day[key];
    const nightLight = new THREE.PointLight(new THREE.Color(NIGHT_LIGHT.color), 0, NIGHT_LIGHT.reach, 1.6);
    nightLight.position.set(...nightLightAt); scene.add(nightLight);
    const mimoLight = new THREE.PointLight(new THREE.Color(MIMO_LIGHT.color), 0, MIMO_LIGHT.reach, 1.4); scene.add(mimoLight);

    function apply() {
      scene.background.copy(now.haze); scene.fog.color.copy(now.haze);
      hemi.color.copy(now.sky); hemi.groundColor.copy(now.ground); hemi.intensity = now.skyPower;
      sun.color.copy(now.sun); sun.intensity = now.sunPower;
      nightLight.intensity = NIGHT_LIGHT.power * now.glow; mimoLight.intensity = MIMO_LIGHT.power * now.glow;
      decorApi.setMood(now); kit.setEnvLevel(now.env);
    }
    // name: 'day', 'evening' or 'night'. dt 0 jumps there at once.
    function step(dt, name, at) {
      const m = MOODS[name] || MOODS.day, k = dt > 0 ? 1 - Math.exp(-FADE_RATE * dt) : 1;
      for (const key of COLORS) now[key].lerp(goal[key].set(m[key]), k);
      for (const key of NUMBERS) now[key] = dt > 0 ? damp(now[key], m[key], FADE_RATE, dt) : m[key];
      if (at) mimoLight.position.set(at.x, at.y + MIMO_LIGHT.up, at.z);
      apply();
    }
    return { step, glow: () => now.glow };
  }

  Room3D.MOODS = MOODS;
  Room3D.makeMood = makeMood;
})();
