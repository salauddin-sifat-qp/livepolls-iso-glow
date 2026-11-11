/* iso.js: isometric projection kernel, reusable object drawers, scene renderer with connectors and travelling packets.
   Colours come only from CSS tokens (see livepoll.css). Origin of every object is the centre of its footprint on the ground. */
(() => {
  'use strict';

  const C = Math.cos(Math.PI / 6);
  const S = 0.5;
  const n = (v) => +v.toFixed(2);
  const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const plane = (O, U, V) => {
    const o = P(...O);
    const u = P(...U);
    const v = P(...V);
    return `matrix(${n(u[0])} ${n(u[1])} ${n(v[0])} ${n(v[1])} ${n(o[0])} ${n(o[1])})`;
  };
  const TOP = (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 1, 0]);
  const FRONT = (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 0, -1]);
  const SIDE = (x, y, z) => plane([x, y, z], [0, -1, 0], [0, 0, -1]);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pts = (a) => a.map((p) => `${n(p[0])},${n(p[1])}`).join(' ');
  const poly = (a, c) => `<polygon class="${c}" points="${pts(a)}"/>`;
  const lr = (u, v, w, h, c, r = 0) =>
    `<rect class="${c}" x="${u}" y="${v}" width="${w}" height="${h}"${r ? ` rx="${r}"` : ''}/>`;
  const G = (tf, inner, cls = '') => `<g${cls ? ` class="${cls}"` : ''} transform="${tf}">${inner}</g>`;
  const shadow = (rx, ry, dy = 0) => `<ellipse class="shadow" cx="0" cy="${dy}" rx="${rx}" ry="${ry}"/>`;

  /* Box with three tonal faces. L = front-left face, R = front-right face, T = top; helpers draw rects in face-local units. */
  function box(x, y, z, w, d, h, o = {}) {
    const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const l = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)];
    const r = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)];
    const tl = FRONT(x, y + d, z + h);
    const tr = SIDE(x + w, y + d, z + h);
    const tt = TOP(x, y, z + h);
    const rect = (tf) => (u, v, ww, hh, c, rr) => G(tf, lr(u, v, ww, hh, c, rr));
    return {
      svg: poly(l, o.l || 'fl') + poly(r, o.r || 'fr') + poly(t, o.t || 'ft'),
      L: rect(tl),
      R: rect(tr),
      T: rect(tt),
      tl,
      tr,
      tt,
    };
  }

  /* Upright cylinder; cy is the centre of the top ellipse. A circle of radius r projects to rx = 1.2247r, ry = 0.7071r. */
  function cyl(cy, r, h) {
    const rx = n(r * 1.2247);
    const ry = n(r * 0.7071);
    return (
      `<path class="fl ns" d="M${-rx} ${cy}V${cy + h}A${rx} ${ry} 0 0 0 ${rx} ${cy + h}V${cy}Z"/>` +
      `<path class="fr ns" d="M${rx} ${cy}V${cy + h}A${rx} ${ry} 0 0 1 0 ${cy + h + ry}V${cy}Z"/>` +
      `<path class="ol" d="M${-rx} ${cy}V${cy + h}A${rx} ${ry} 0 0 0 ${rx} ${cy + h}V${cy}"/>` +
      `<ellipse class="ft" cx="0" cy="${cy}" rx="${rx}" ry="${ry}"/>`
    );
  }

  function dbStack(r, count, h, gap) {
    const rx = r * 1.2247;
    const ry = r * 0.7071;
    let s = '';
    for (let i = 0; i < count; i++) {
      const cy = -h - i * (h + gap);
      s += cyl(cy, r, h);
      s += `<circle class="live" cx="${n(rx * 0.55)}" cy="${n(cy + ry * 0.83 + h * 0.5)}" r="2.2"/>`;
      s += `<path class="slit-s" d="M${n(-rx * 0.72)} ${n(cy + ry * 0.7 + h * 0.5)}L${n(-rx * 0.2)} ${n(cy + ry * 0.97 + h * 0.5)}"/>`;
    }
    return s;
  }

  const out = (svg, mid, top, by) => ({ svg, mid, top, by });

  const DRAW = {
    laptop() {
      const base = box(-48, -34, 0, 96, 68, 6);
      const lid = box(-48, -34, 6, 96, 4, 56);
      let s = shadow(78, 40, 4) + base.svg + lid.svg;
      s += lid.L(4, 4, 88, 48, 'scr', 2) + lid.L(10, 9, 52, 4, 'ink', 2);
      for (let i = 0; i < 4; i++) {
        s += lid.L(10, 18 + i * 8.5, 5, 5, 'dim', 2) + lid.L(18, 18 + i * 8.5, 52 + (i === 1 ? 12 : 0), 5, i === 1 ? 'acc' : 'dim', 2);
      }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) s += base.T(8 + c * 8.4, 8 + r * 8, 6.4, 5, 'key', 1);
      s += base.T(30, 38, 36, 22, 'key', 2);
      return out(s, [0, -30], [0, -62], 41);
    },

    /* Body 44 x 8 x 88; the wide front face (long axis most visible) carries a light bezel and a rounded screen inset. */
    phone(o = {}) {
      const b = box(-22, -4, 0, 44, 8, 88, { l: 'bez' });
      const choice = o.choice ?? 0;
      const face = (inner) => G(b.tl, G('translate(2 2)', inner));
      const head = lr(8, 12, 24, 4, 'dim', 2);
      const rows = (live) =>
        [0, 1, 2, 3].map((i) => lr(6, 24 + i * 14, 28, 10, live === i ? 'live' : 'dim', 3)).join('');
      let s = shadow(34, 15, 2) + b.svg + b.L(4, 4, 36, 80, 'scr', 6);
      s += `<g class="m m-q">${face(head + rows(-1))}</g><g class="m m-v">${face(head + rows(choice))}</g>`;
      let pin = lr(10, 18, 20, 4, 'dim', 2) + lr(8, 58, 24, 8, 'dim', 3);
      let digits = '';
      [...'4829'].forEach((d, i) => {
        pin += lr(6 + i * 7.5, 34, 6.5, 12, 'pinbox', 1.5);
        digits += `<text class="ptxt acc-t dg" style="--i:${i}" x="${9.25 + i * 7.5}" y="43" text-anchor="middle" font-size="9">${d}</text>`;
      });
      s += `<g class="m m-pin">${face(pin + digits)}</g>`;
      s += `<g class="m m-done">${face(
        `<circle class="acc-s" cx="20" cy="36" r="11"/><path class="acc-s" d="M14 36L19 41L27 31"/><text class="stx" x="20" y="62" text-anchor="middle" font-size="10">Thanks</text>`,
      )}</g>`;
      return out(s, [0, -44], [0, -88], 11);
    },

    presenterScreen(o = {}) {
      const foot = box(-28, -12, 0, 56, 24, 4);
      const neck = box(-4, -4, 4, 8, 8, 14);
      const panel = box(-80, -5, 18, 160, 5, 110);
      const labels = o.labels || [];
      let s = shadow(80, 28, 2) + foot.svg + neck.svg + panel.svg + panel.L(5, 5, 150, 100, 'scr', 4);
      let face = o.title
        ? `<text class="stx" x="14" y="26" font-size="16">${esc(o.title)}</text>`
        : lr(14, 14, 70, 8, 'dim', 2);
      let opts = '';
      let bars = '';
      for (let i = 0; i < 4; i++) {
        const y = 38 + i * 16;
        opts += labels[i]
          ? `<text class="stx" x="14" y="${y + 9}" font-size="12">${esc(labels[i])}</text>`
          : lr(14, y + 3, 28, 5, 'dim', 2);
        opts += lr(52, y, 72, 11, 'dim', 3);
        bars +=
          `<rect class="live bar" data-bar="${i}" x="52" y="${y}" width="72" height="11" rx="3"/>` +
          `<text class="ptxt acc-t" data-cnt="${i}" x="132" y="${y + 9}" font-size="12">0</text>`;
      }
      face += `<g class="m m-opts">${opts}</g><g class="m m-bars">${bars}</g>`;
      face +=
        `<g class="m m-pin"><text class="stx" x="80" y="62" text-anchor="middle" font-size="20">livepoll.io</text>` +
        `<text class="ptxt acc-t" x="80" y="94" text-anchor="middle" font-size="26">PIN 4829</text></g>`;
      s += G(panel.tl, face);
      return out(s, [0, -76], [0, -128], 20);
    },

    reportSheet() {
      const plate = box(-22, -10, 0, 44, 20, 3);
      const sheet = box(-34, -2, 3, 68, 4, 88);
      let s = shadow(46, 20, 3) + plate.svg + sheet.svg;
      let face = lr(8, 9, 28, 3, 'slit', 1) + lr(8, 15, 40, 2, 'slit', 1) + lr(8, 60, 52, 1, 'slit');
      [30, 20, 12, 24].forEach((h, i) => (face += lr(10 + i * 13.5, 60 - h, 9, h, 'live', 1)));
      face += lr(8, 66, 44, 2, 'slit', 1) + lr(8, 72, 36, 2, 'slit', 1) + lr(8, 78, 40, 2, 'slit', 1);
      s += G(sheet.tl, face);
      return out(s, [0, -48], [0, -91], 16);
    },

    router() {
      const b = box(-50, -30, 0, 100, 60, 22);
      let s = shadow(80, 40, 3) + b.svg + b.T(10, 10, 80, 40, 'inset', 3);
      s += G(b.tt, `<path class="live-s ar" d="M22 22H70M62 16L70 22L62 28M78 38H30M38 32L30 38L38 44"/>`);
      for (let i = 0; i < 5; i++) s += b.L(10 + i * 9, 5, 4, 3, 'live', 1) + b.L(9 + i * 9, 11, 6, 6, 'scr', 1);
      for (let j = 0; j < 4; j++) s += b.L(62 + j * 8, 6, 1.5, 10, 'slit');
      return out(s, [0, -12], [0, -22], 40);
    },

    serverStack(o = {}) {
      const k = o.units || 3;
      let s = shadow(76, 40, 4);
      for (let i = 0; i < k; i++) {
        const b = box(-36, -28, i * 26, 72, 56, 22);
        s += b.svg;
        for (let j = 0; j < 8; j++) s += b.L(8 + j * 5, 5, 1.5, 12, 'slit');
        s += b.L(54, 6, 6, 6, 'live', 1.5) + b.L(63, 6, 5, 6, 'dim2', 1.5) + b.L(8, 19, 30, 1.5, 'slit');
        if (i === k - 1) s += b.T(8, 8, 56, 40, 'inset', 3);
      }
      const h = (k - 1) * 26 + 22;
      return out(s, [0, -h / 2], [0, -h], 32);
    },

    redisCube() {
      const b = box(-28, -28, 0, 56, 56, 44);
      let s = shadow(60, 32, 3) + b.svg;
      s += G(
        b.tt,
        `<circle class="ring-d" cx="28" cy="28" r="22"/><circle class="ring-d" cx="28" cy="28" r="15"/><circle class="live" cx="28" cy="28" r="5"/>`,
      );
      s += G(
        b.tl,
        `<circle class="live" cx="28" cy="22" r="3.5"/>` +
          `<path class="live-s" d="M34 15a9 9 0 0 1 0 14M38 11a14 14 0 0 1 0 22M22 15a9 9 0 0 0 0 14M18 11a14 14 0 0 0 0 22"/>`,
      );
      s += b.R(8, 10, 40, 1.5, 'slit') + b.R(8, 20, 40, 1.5, 'slit') + b.R(8, 30, 40, 1.5, 'slit');
      return out(s, [0, -22], [0, -44], 28);
    },

    database(o = {}) {
      const r = o.r || 34;
      const s = shadow(r * 1.4, r * 0.82, 2) + dbStack(r, 3, 14, 3);
      return out(s, [0, -30], [0, -48], n(r * 0.71));
    },

    globalDb() {
      const R = 50;
      const rx = n(R * 1.2247);
      const ry = n(R * 0.7071);
      const cy = -26;
      let s = shadow(70, 40, 2);
      s += `<path class="live-s ring" d="M${-rx} ${cy}A${rx} ${ry} 0 0 1 ${rx} ${cy}"/>`;
      s += dbStack(28, 3, 14, 3);
      s += `<path class="live-s ring" d="M${-rx} ${cy}A${rx} ${ry} 0 0 0 ${rx} ${cy}"/>`;
      s += `<circle class="live" cx="${n(rx * 0.7)}" cy="${n(cy + ry * 0.71)}" r="3"/>`;
      return out(s, [0, -26], [0, -48], 36);
    },

    person() {
      const rxb = 17.15;
      const ryb = 9.9;
      const rxt = 9.8;
      const ryt = 5.66;
      const hh = 34;
      let s = shadow(24, 13, 1);
      s += `<ellipse class="ring-live" cx="0" cy="0" rx="28" ry="16"/>`;
      s += `<path class="fl ns" d="M${-rxb} 0A${rxb} ${ryb} 0 0 0 ${rxb} 0L${rxt} ${-hh}L${-rxt} ${-hh}Z"/>`;
      s += `<path class="fr ns" d="M0 ${ryb}A${rxb} ${ryb} 0 0 0 ${rxb} 0L${rxt} ${-hh}L0 ${-hh}Z"/>`;
      s += `<path class="ol" d="M${-rxb} 0A${rxb} ${ryb} 0 0 0 ${rxb} 0L${rxt} ${-hh}M${-rxb} 0L${-rxt} ${-hh}"/>`;
      s += `<ellipse class="ft" cx="0" cy="${-hh}" rx="${rxt}" ry="${ryt}"/>`;
      s += `<circle class="fl" cx="0" cy="-48" r="11"/><circle class="ft ns" cx="-3.5" cy="-51.5" r="6.5"/>`;
      s += `<circle class="live" cx="0" cy="-12" r="2.5"/>`;
      return out(s, [0, -26], [0, -60], 24);
    },

    pluginTile(o = {}) {
      const slab = box(-30, -30, 0, 60, 60, 12);
      const plate = box(-22, -22, 12, 44, 44, 3, { t: 'inset' });
      const g = {
        slides: `<rect class="live-s" x="6" y="9" width="32" height="22" rx="2"/><path class="live" d="M19 15V25L28 20Z"/><path class="live-s" d="M22 31V37M15 37H29"/>`,
        chat: `<path class="live-s" d="M8 9H36a3 3 0 0 1 3 3V26a3 3 0 0 1-3 3H22L14 36V29H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z"/><circle class="live" cx="14" cy="19" r="2"/><circle class="live" cx="22" cy="19" r="2"/><circle class="live" cx="30" cy="19" r="2"/>`,
        video: `<rect class="live-s" x="5" y="12" width="25" height="20" rx="3"/><path class="live" d="M33 22L40 16V29Z"/>`,
        meet: `<circle class="live" cx="15" cy="15" r="5"/><circle class="live" cx="29" cy="15" r="5"/><path class="live-s" d="M5 34a10 10 0 0 1 20 0M19 34a10 10 0 0 1 20 0"/>`,
        cap: `<path class="live-s" d="M22 8L40 17L22 26L4 17Z"/><path class="live-s" d="M12 22V30C16 35 28 35 32 30V22M40 17V28"/><circle class="live" cx="40" cy="29" r="2"/>`,
        brush: `<g transform="rotate(-40 24 20)"><rect class="live-s" x="21" y="4" width="6" height="20" rx="2"/><path class="live" d="M21 24H27V29a3 3 0 0 1-6 0Z"/></g><circle class="live" cx="11" cy="35" r="4"/>`,
        chip: `<rect class="live-s" x="12" y="12" width="20" height="20" rx="2"/><rect class="live" x="18" y="18" width="8" height="8" rx="1"/><path class="live-s" d="M17 7V12M22 7V12M27 7V12M17 32V37M22 32V37M27 32V37M7 17H12M7 22H12M7 27H12M32 17H37M32 22H37M32 27H37"/>`,
      };
      const s = shadow(52, 28, 3) + slab.svg + plate.svg + G(plate.tt, g[o.glyph] || g.chip);
      return out(s, [0, -8], [0, -15], 30);
    },
  };

  /* ---------- scene renderer ---------- */

  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  function polyLen(p) {
    const seg = [];
    let total = 0;
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      seg.push(l);
      total += l;
    }
    return { seg, total };
  }

  function pointAt(p, seg, dist) {
    let d = dist;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const t = seg[i] ? Math.min(1, d / seg[i]) : 1;
        return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t];
      }
      d -= seg[i];
    }
    return p[p.length - 1];
  }

  function createScene(svg, def, opts = {}) {
    const [W, H] = def.view || [800, 540];
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.classList.toggle('small', !!def.small);

    const objs = new Map();
    def.objects.forEach((o) => {
      objs.set(o.id, { def: o, d: DRAW[o.type](o.opts || {}), s: o.scale || 1, x: o.at[0], y: o.at[1] });
    });
    const anchor = (id, name) => {
      const o = objs.get(id);
      const a = name === 'base' ? [0, 0] : o.d[name || 'mid'] || o.d.mid;
      return [o.x + a[0] * o.s, o.y + a[1] * o.s];
    };

    const conns = new Map();
    const adj = new Map();
    def.conns.forEach((c) => {
      const a = anchor(c.from, c.fa);
      const b = anchor(c.to, c.ta);
      let p = [a, b];
      if (c.route === 'hv') p = [a, [b[0], a[1]], b];
      else if (c.route === 'vh') p = [a, [a[0], b[1]], b];
      else if (c.route === 'bus') p = [a, [a[0], c.bus], [b[0], c.bus], b];
      const { seg, total } = polyLen(p);
      conns.set(c.id, { def: c, p, seg, total });
      [
        [c.from, c.to, false],
        [c.to, c.from, true],
      ].forEach(([f, t, rev]) => {
        if (!adj.has(f)) adj.set(f, []);
        adj.get(f).push({ to: t, c: c.id, rev });
      });
    });

    let html = '';
    (def.zones || []).forEach((z) => {
      const pick = z.select ? ` data-zone="${z.id}" tabindex="0" role="button" aria-label="Select ${esc(z.label)}"` : '';
      html +=
        `<g class="zone ${z.kind || 'local'}"${pick}><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="16"/>` +
        `<text class="zl" x="${z.x + 16}" y="${z.y + 28}">${esc(z.label)}</text>` +
        (z.sub ? `<text class="zs" x="${z.x + 16}" y="${z.y + 48}">${esc(z.sub)}</text>` : '') +
        `</g>`;
    });
    html += '<g class="conns">';
    conns.forEach((c, id) => {
      html += `<path class="conn" data-c="${id}" d="M${c.p.map((q) => `${n(q[0])} ${n(q[1])}`).join('L')}"/>`;
    });
    html += '</g>';
    [...objs.values()]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((o) => {
        html += `<g class="obj ${o.def.type}" data-o="${o.def.id}" transform="translate(${o.x} ${o.y}) scale(${o.s})">${o.d.svg}</g>`;
      });
    objs.forEach((o, id) => {
      if (o.def.noLabel) return;
      const lb = o.def.label || {};
      const big = lb.big ? ' big' : '';
      const lx = o.x + (lb.dx || 0);
      const ly = o.y + (lb.dy != null ? lb.dy : o.d.by * o.s + 16);
      const ta = `text-anchor="${lb.anchor || 'middle'}"`;
      html +=
        `<g class="olabel${big}" data-l="${id}"><text class="on" ${ta} x="${lx}" y="${n(ly)}">${esc(o.def.name || '')}</text>` +
        (o.def.sub ? `<text class="os" ${ta} x="${lx}" y="${n(ly + (lb.big ? 24 : 18))}">${esc(o.def.sub)}</text>` : '') +
        `</g>`;
    });
    conns.forEach((c, id) => {
      if (!c.def.label) return;
      const [mx, my] = pointAt(c.p, c.seg, c.total / 2);
      const w = c.def.label.length * 9.6 + 16;
      html +=
        `<g class="badge" data-b="${id}" transform="translate(${n(mx)} ${n(my)})"><rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12"/>` +
        `<text y="5.5">${esc(c.def.label)}</text></g>`;
    });
    html += '<g class="packets"></g>';
    svg.innerHTML = html;

    const q = (sel) => [...svg.querySelectorAll(sel)];
    objs.forEach((o, id) => {
      o.g = svg.querySelector(`[data-o="${id}"]`);
      o.label = svg.querySelector(`[data-l="${id}"]`);
      if (o.def.opts && o.def.opts.mode) o.g.dataset.mode = o.def.opts.mode;
    });
    conns.forEach((c, id) => {
      c.el = svg.querySelector(`[data-c="${id}"]`);
      c.badge = svg.querySelector(`[data-b="${id}"]`);
    });

    /* Object footprint (drawn shapes plus 4px), in scene units. Shadows are skipped so they do not inflate it. */
    const rects = new Map();
    const rectOf = (id) => {
      if (rects.has(id)) return rects.get(id);
      const o = objs.get(id);
      let r = [Infinity, Infinity, -Infinity, -Infinity];
      const grow = (b, ox, oy, k) => {
        r = [Math.min(r[0], ox + b.x * k), Math.min(r[1], oy + b.y * k), Math.max(r[2], ox + (b.x + b.width) * k), Math.max(r[3], oy + (b.y + b.height) * k)];
      };
      [...o.g.children].forEach((ch) => {
        if (!ch.classList.contains('shadow') && !ch.hasAttribute('transform')) grow(ch.getBBox(), o.x, o.y, o.s);
      });
      r = [r[0] - 4, r[1] - 4, r[2] + 4, r[3] + 4];
      rects.set(id, r);
      return r;
    };
    const labelOf = (id) => {
      const o = objs.get(id);
      if (!o.label) return null;
      const b = o.label.getBBox();
      return [b.x - 4, b.y - 4, b.x + b.width + 4, b.y + b.height + 4];
    };
    const labelRects = [...objs.keys()].map(labelOf).filter(Boolean);
    const hits = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const inside = (r, [x, y]) => !!r && x > r[0] && x < r[2] && y > r[1] && y < r[3];
    /* Cut a connector at the drawn footprint of each end; if it would cross that object's own label, end at the label edge instead. */
    const trim = (p, from, to, fromLabel, toLabel) => {
      const { seg, total } = polyLen(p);
      let d0 = 0;
      let d1 = total;
      while (d0 < total && inside(from, pointAt(p, seg, d0))) d0 += 2;
      while (d1 > d0 && inside(to, pointAt(p, seg, d1))) d1 -= 2;
      for (let d = d0; d <= d1; d += 2) {
        if (inside(toLabel, pointAt(p, seg, d))) {
          d1 = d;
          break;
        }
      }
      for (let d = d1; d >= d0; d -= 2) {
        if (inside(fromLabel, pointAt(p, seg, d))) {
          d0 = d;
          break;
        }
      }
      if (d1 - d0 < 8) return p;
      const mid = [];
      let acc = 0;
      for (let i = 1; i < p.length - 1; i++) {
        acc += seg[i - 1];
        if (acc > d0 && acc < d1) mid.push(p[i]);
      }
      return [pointAt(p, seg, d0), ...mid, pointAt(p, seg, d1)];
    };
    conns.forEach((c) => {
      c.p = trim(c.p, rectOf(c.def.from), rectOf(c.def.to), labelOf(c.def.from), labelOf(c.def.to));
      Object.assign(c, polyLen(c.p));
      c.el.setAttribute('d', `M${c.p.map((q) => `${n(q[0])} ${n(q[1])}`).join('L')}`);
    });
    /* Badge sits at the midpoint of the visible segment, nudged to the nearest spot that clears labels, object footprints, zone borders and earlier badges. */
    const badgeRects = [];
    const footprints = [...objs.keys()].map(rectOf);
    const zoneRects = (def.zones || []).map((z) => [z.x, z.y, z.x + z.w, z.y + z.h]);
    const straddles = (a, z) => hits(a, z) && !(a[0] > z[0] + 2 && a[2] < z[2] - 2 && a[1] > z[1] + 2 && a[3] < z[3] - 2);
    conns.forEach((c) => {
      if (!c.badge) return;
      const w = c.def.label.length * 9.6 + 16;
      const box = (x, y) => [x - w / 2 - 2, y - 14, x + w / 2 + 2, y + 14];
      const spots = [];
      for (let off = -c.total / 2; off <= c.total / 2; off += 6) {
        [0, -16, 16, -32, 32, -48, 48].forEach((dy) => spots.push({ off, dy, cost: Math.abs(off) + Math.abs(dy) * 1.5 }));
      }
      spots.sort((a, b) => a.cost - b.cost);
      let best = null;
      for (const s of spots) {
        const [x, y] = pointAt(c.p, c.seg, c.total / 2 + s.off);
        const b = box(x, y + s.dy);
        if (
          !labelRects.some((r) => hits(b, r)) &&
          !footprints.some((r) => hits(b, r)) &&
          !badgeRects.some((r) => hits(b, r)) &&
          !zoneRects.some((z) => straddles(b, z))
        ) {
          best = [x, y + s.dy];
          break;
        }
      }
      const [mx, my] = best || pointAt(c.p, c.seg, c.total / 2);
      c.badge.setAttribute('transform', `translate(${n(mx)} ${n(my)})`);
      badgeRects.push([mx - w / 2, my - 12, mx + w / 2, my + 12]);
    });
    const connsG = svg.querySelector('.conns');
    const packetsG = svg.querySelector('.packets');
    const bars = q('[data-bar]');
    const counts = q('[data-cnt]');

    const onZone = (e) => {
      const z = e.target.closest('[data-zone]');
      if (!z || !opts.onZone) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      opts.onZone(z.dataset.zone);
    };
    svg.addEventListener('click', onZone);
    svg.addEventListener('keydown', onZone);

    function update(st) {
      const lit = st.lit || new Set();
      const dim = st.dim || new Set();
      const active = st.active || new Set();
      const quiet = st.quiet || new Set();
      objs.forEach((o, id) => {
        o.g.classList.toggle('lit', lit.has(id));
        o.g.classList.toggle('faded', dim.has(id));
        o.g.classList.toggle('quiet', quiet.has(id));
        if (o.label) {
          o.label.classList.toggle('faded', dim.has(id));
          o.label.classList.toggle('quiet', quiet.has(id));
        }
        if (st.modes && st.modes[id] != null) o.g.dataset.mode = st.modes[id];
      });
      conns.forEach((c, id) => {
        const on = active.has(id);
        const off = dim.has(c.def.from) || dim.has(c.def.to);
        const hush = quiet.has(c.def.from) || quiet.has(c.def.to);
        c.el.classList.toggle('on', on);
        c.el.classList.toggle('faded', off);
        c.el.classList.toggle('quiet', hush);
        if (c.badge) {
          c.badge.classList.toggle('on', on);
          c.badge.classList.toggle('faded', off);
          c.badge.classList.toggle('quiet', hush);
        }
        if (on) connsG.appendChild(c.el);
      });
      svg.querySelectorAll('[data-zone]').forEach((z) => {
        z.classList.toggle('sel', !!st.zoneSel && st.zoneSel.has(z.dataset.zone));
        z.classList.toggle('faded', !!st.zoneDim && st.zoneDim.has(z.dataset.zone));
      });
      if (st.votes) {
        const cap = def.voteCap || 3;
        bars.forEach((b) => {
          const v = Math.min(1, (st.votes[+b.dataset.bar] || 0) / cap);
          b.style.transform = `scaleX(${v})`;
        });
        counts.forEach((t) => (t.textContent = st.votes[+t.dataset.cnt] || 0));
      }
    }

    /* Shortest chain of connectors between two objects, skipping disabled objects. */
    function route(from, to, blocked = new Set()) {
      if (from === to) return [];
      const prev = new Map([[from, null]]);
      const queue = [from];
      while (queue.length) {
        const cur = queue.shift();
        if (cur === to) break;
        (adj.get(cur) || []).forEach((e) => {
          if (prev.has(e.to) || blocked.has(e.to)) return;
          prev.set(e.to, { from: cur, c: e.c, rev: e.rev });
          queue.push(e.to);
        });
      }
      if (!prev.has(to)) return null;
      const path = [];
      for (let cur = to; prev.get(cur); cur = prev.get(cur).from) path.unshift({ c: prev.get(cur).c, rev: prev.get(cur).rev, node: cur });
      return path;
    }

    let raf = 0;
    let timer = 0;
    function cancel() {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      packetsG.innerHTML = '';
    }

    /* routes: array of connector chains; every chain gets its own pill, all travel together. */
    function send(routes, label, done) {
      cancel();
      const items = routes
        .filter((r) => r && r.length)
        .map((r) => {
          let p = [];
          r.forEach((st) => {
            const c = conns.get(st.c);
            const seg = st.rev ? [...c.p].reverse() : c.p;
            p = p.concat(p.length ? seg.slice(1) : seg);
          });
          const first = conns.get(r[0].c).def;
          return { p, ...polyLen(p), src: rectOf(r[0].rev ? first.to : first.from), dst: rectOf(r[r.length - 1].node) };
        });
      if (!items.length) {
        timer = setTimeout(done, 650);
        return;
      }
      /* The pill rides the connector between the two endpoint rects and never overlaps them; if it does not fit, only a dot travels. */
      const H = 14;
      const clear = (it, d, w, r) => {
        const [x, y] = pointAt(it.p, it.seg, d);
        return x + w / 2 < r[0] || x - w / 2 > r[2] || y + H < r[1] || y - H > r[3];
      };
      const span = (it, w) => {
        let d0 = 0;
        let d1 = it.total;
        while (d0 < it.total && !clear(it, d0, w, it.src)) d0 += 2;
        while (d1 > d0 && !clear(it, d1, w, it.dst)) d1 -= 2;
        return [d0, d1];
      };
      const fullW = label.length * 8 + 40;
      items.forEach((it) => {
        let w = fullW;
        [it.d0, it.d1] = span(it, w);
        it.dot = it.d1 - it.d0 < 8;
        if (it.dot) {
          w = 20;
          [it.d0, it.d1] = span(it, w);
          if (it.d1 < it.d0) [it.d0, it.d1] = [0, it.total];
        }
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'packet');
        g.innerHTML =
          (it.dot
            ? ''
            : `<g class="pill"><rect x="${-w / 2}" y="${-H}" width="${w}" height="${2 * H}" rx="${H}"/><circle cx="${-w / 2 + 16}" cy="0" r="4"/><text x="${-w / 2 + 28}" y="5.5">${esc(label)}</text></g>`) +
          `<circle class="pdot" cx="0" cy="0" r="7"${it.dot ? '' : ' display="none"'}/>`;
        it.w = w;
        it.pill = g.querySelector('.pill');
        it.pdot = g.querySelector('.pdot');
        packetsG.appendChild(g);
        it.g = g;
      });
      /* While the pill would overlap any object label or badge, only the dot shows. */
      const place = (it, d) => {
        const [x, y] = pointAt(it.p, it.seg, d);
        it.g.setAttribute('transform', `translate(${n(x)} ${n(y)})`);
        if (!it.pill) return;
        const r = [x - it.w / 2, y - H, x + it.w / 2, y + H];
        const blocked = labelRects.some((b) => hits(r, b)) || badgeRects.some((b) => hits(r, b));
        it.pill.setAttribute('display', blocked ? 'none' : 'inline');
        it.pdot.setAttribute('display', blocked ? 'inline' : 'none');
      };
      if (reduceMotion()) {
        items.forEach((it) => place(it, it.d1));
        timer = setTimeout(done, 700);
        return;
      }
      items.forEach((it) => place(it, it.d0));
      const longest = Math.max(...items.map((it) => it.d1 - it.d0));
      const dur = Math.max(700, (longest / 360) * 1000);
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        items.forEach((it) => place(it, it.d0 + e * (it.d1 - it.d0)));
        if (t < 1) raf = requestAnimationFrame(tick);
        else {
          items.forEach((it) => it.g.classList.add('arrive'));
          timer = setTimeout(done, 250);
        }
      };
      raf = requestAnimationFrame(tick);
    }

    return {
      update,
      route,
      send,
      cancel,
      destroy() {
        cancel();
        svg.removeEventListener('click', onZone);
        svg.removeEventListener('keydown', onZone);
        svg.innerHTML = '';
      },
    };
  }

  window.ISO = { P, TOP, FRONT, SIDE, box, draw: DRAW, createScene };
})();
