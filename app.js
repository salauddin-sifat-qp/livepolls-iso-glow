/* app.js: hash routing, theme and accent, player (Play/Step/Reset), and rendering of nav, step, table and inspector. */
(() => {
  'use strict';

  const { LP, ISO } = window;
  const view = document.getElementById('view');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ---------- theme and accent ---------- */
  const store = {
    get(k, d) {
      try {
        return localStorage.getItem(k) || d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* storage can be blocked on file:// in some browsers */
      }
    },
  };

  const ACCENTS = [
    { id: 'blue', name: 'Wick Blue', dark: ['#1B87E6', '#54A5EC'], light: ['#1B87E6', '#54A5EC'] },
    { id: 'orange', name: 'Wick Orange', dark: ['#F58300', '#F5A300'], light: ['#F58300', '#F5A300'] },
    { id: 'neon', name: 'Neon', dark: ['#ff4fa3', '#ff80bd'], light: ['#ff4fa3', '#ff80bd'] },
    { id: 'moon', name: 'Moon', dark: ['#dfe7f5', '#ffffff'], light: ['#273246', '#3b4a66'] },
  ];

  let theme = store.get('lp-theme', 'light');
  let accentId = store.get('lp-accent', 'blue');

  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  function applyLook() {
    const root = document.documentElement;
    const a = ACCENTS.find((x) => x.id === accentId) || ACCENTS[0];
    const [c, hi] = a[theme];
    accentId = a.id;
    root.dataset.theme = theme;
    root.style.setProperty('--accent', c);
    root.style.setProperty('--accent-hi', hi);
    root.style.setProperty('--accent-deep', theme === 'dark' ? hi : c);
    root.style.setProperty('--on-accent', lum(c) > 0.5 ? '#0f1217' : '#ffffff');
    document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
    document.querySelectorAll('.swatch').forEach((b) => {
      b.style.setProperty('--sw', ACCENTS.find((x) => x.id === b.dataset.accent)[theme][0]);
      b.setAttribute('aria-pressed', String(b.dataset.accent === accentId));
    });
  }

  function initChrome() {
    $('#swatches').innerHTML = ACCENTS.map(
      (a) =>
        `<button type="button" class="swatch" data-accent="${a.id}" aria-label="${a.name}" title="${a.name}"></button>`,
    ).join('');
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-theme-set]');
      const s = e.target.closest('.swatch');
      if (t) {
        theme = t.dataset.themeSet;
        store.set('lp-theme', theme);
        applyLook();
      } else if (s) {
        accentId = s.dataset.accent;
        store.set('lp-accent', accentId);
        applyLook();
      }
    });
    applyLook();
  }

  /* ---------- message resolution ---------- */
  const fmtCtx = (str, ctx) => {
    const r = LP.regions[ctx.region];
    return str.replace(/\{R\}/g, r.name).replace(/\{r\}/g, ctx.region).replace(/\{redis\}/g, r.redis);
  };

  function buildFrames(lesson, ctx) {
    const single = ctx.instances === 1 ? lesson.scene.single : null;
    const alias = (id) => (single && single.alias[id]) || id;
    const frames = [];
    const rows = [];
    const steps = [];
    let n = 0;
    lesson.steps.forEach((st, si) => {
      steps.push(
        JSON.parse(
          fmtCtx(
            JSON.stringify({ title: st.title, text: single && st.text1 ? st.text1 : st.text, lit: st.lit || [], set: st.set }),
            ctx,
          ),
        ),
      );
      const msgs = (st.messages || [])
        .filter((m) => !m.when || m.when === ctx.instances)
        .map((m) => {
          const j = JSON.parse(fmtCtx(JSON.stringify(m), ctx));
          j.from = alias(j.from);
          j.to = Array.isArray(j.to) ? j.to.map(alias) : alias(j.to);
          return j;
        });
      if (!msgs.length) frames.push({ i: frames.length, step: si, msg: null, first: true });
      msgs.forEach((m, k) => {
        const f = { i: frames.length, step: si, msg: m, n: ++n, first: k === 0 };
        frames.push(f);
        rows.push(f);
      });
    });
    return { frames, rows, steps };
  }

  /* ---------- player ---------- */
  function createPlayer(lesson, svg, hooks, opts = {}) {
    const ctx = { instances: 2, region: 'us' };
    let built = buildFrames(lesson, ctx);
    let idx = 0;
    let playing = false;
    let token = 0;
    let timer = 0;
    let finishStep = -1;

    const single = () => (ctx.instances === 1 ? lesson.scene.single : null);
    const dimSet = () => {
      const d = new Set(single() ? single().dim : []);
      if (lesson.regionPick) {
        lesson.scene.objects.forEach((o) => {
          const p = o.id.split('-')[0];
          if (LP.regions[p] && p !== ctx.region) d.add(o.id);
        });
      }
      return d;
    };

    const sc = ISO.createScene(svg, lesson.scene, {
      onZone: (id) => {
        if (lesson.regionPick) setCtx({ region: id });
      },
    });

    function stateAt(i) {
      const modes = {};
      lesson.scene.objects.forEach((o) => (modes[o.id] = (o.opts && o.opts.mode) || ''));
      let votes = [0, 0, 0, 0];
      const apply = (set) => {
        if (!set) return;
        if (set.modes) Object.assign(modes, set.modes);
        if (set.votes) votes = set.votes;
      };
      for (let j = 0; j <= i; j++) {
        const f = built.frames[j];
        if (f.first) apply(built.steps[f.step].set);
        if (f.msg) apply(f.msg.set);
      }
      return { modes, votes };
    }

    function show(i, animate) {
      clearTimeout(timer);
      idx = i;
      const f = built.frames[i];
      const my = ++token;
      const dim = dimSet();
      const lit = new Set(built.steps[f.step].lit);
      const active = new Set();
      const routes = [];
      if (f.msg) {
        lit.add(f.msg.from);
        [].concat(f.msg.to).forEach((t) => {
          lit.add(t);
          const r = sc.route(f.msg.from, t, dim);
          if (!r) return;
          routes.push(r);
          r.forEach((s) => {
            active.add(s.c);
            lit.add(s.node);
          });
        });
      }
      const { modes, votes } = stateAt(i);
      let quiet = null;
      const stepMsgs = built.frames.filter((x) => x.step === f.step && x.msg);
      if (lesson.focus !== false && (stepMsgs.length || built.steps[f.step].lit.length)) {
        const focus = new Set(built.steps[f.step].lit);
        stepMsgs.forEach(({ msg }) => {
          focus.add(msg.from);
          [].concat(msg.to).forEach((t) => {
            focus.add(t);
            (sc.route(msg.from, t, dim) || []).forEach((s) => focus.add(s.node));
          });
        });
        quiet = new Set(lesson.scene.objects.map((o) => o.id).filter((id) => !focus.has(id)));
      }
      sc.update({
        lit,
        dim,
        quiet,
        active,
        modes,
        votes,
        zoneSel: lesson.regionPick ? new Set([ctx.region]) : null,
        zoneDim: lesson.regionPick ? new Set(LP.regionIds.filter((r) => r !== ctx.region)) : null,
      });
      hooks.onFrame(f, i, built, ctx);
      sc.cancel();
      if (!animate) return;
      const done = () => {
        if (my !== token) return;
        const next = built.frames[i + 1];
        if (playing || (next && next.step === f.step && finishStep === f.step)) timer = setTimeout(advance, 600);
        else if (!next) hooks.onPlay(false);
      };
      if (f.msg) sc.send(routes, f.msg.name, done);
      else timer = setTimeout(done, 1100);
    }

    function advance() {
      const next = built.frames[idx + 1];
      if (next) show(next.i, true);
      else if (opts.loop) timer = setTimeout(() => show(0, true), 1200);
      else {
        playing = false;
        hooks.onPlay(false);
      }
    }

    const firstOf = (step) => built.frames.find((f) => f.step === step && f.first).i;

    function setCtx(patch) {
      const step = built.frames[idx].step;
      Object.assign(ctx, patch);
      built = buildFrames(lesson, ctx);
      hooks.onBuilt(built, ctx);
      finishStep = step;
      show(firstOf(step), true);
    }

    return {
      ctx,
      get built() {
        return built;
      },
      get playing() {
        return playing;
      },
      get step() {
        return built.frames[idx].step;
      },
      setCtx,
      start() {
        hooks.onBuilt(built, ctx);
      },
      show(i, animate = true) {
        finishStep = -1;
        show(i, animate);
      },
      goStep(s) {
        const step = Math.max(0, Math.min(built.steps.length - 1, s));
        finishStep = step;
        show(firstOf(step), true);
      },
      next() {
        if (this.step < built.steps.length - 1) this.goStep(this.step + 1);
      },
      prev() {
        if (this.step > 0) this.goStep(this.step - 1);
      },
      play() {
        playing = true;
        hooks.onPlay(true);
        const atEnd = idx >= built.frames.length - 1 && !opts.loop;
        show(atEnd ? 0 : idx, true);
      },
      pause() {
        playing = false;
        clearTimeout(timer);
        hooks.onPlay(false);
      },
      toggle() {
        if (playing) this.pause();
        else this.play();
      },
      reset() {
        playing = false;
        finishStep = -1;
        hooks.onPlay(false);
        show(0, false);
      },
      destroy() {
        token++;
        clearTimeout(timer);
        sc.destroy();
      },
    };
  }

  /* ---------- rendering helpers ---------- */
  const nameOf = (lesson, id) => {
    const o = lesson.scene.objects.find((x) => x.id === id);
    return (o && o.name) || id;
  };
  const toName = (lesson, m) => m.toLabel || nameOf(lesson, [].concat(m.to)[0]);
  const fromName = (lesson, m) => m.fromLabel || nameOf(lesson, m.from);

  const highlight = (json) =>
    esc(json).replace(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g, (m, s, colon, b) => {
      if (s) return colon ? `<span class="k">${s}</span>${colon}` : `<span class="s">${s}</span>`;
      return b ? `<span class="b">${m}</span>` : `<span class="n">${m}</span>`;
    });

  function inspectorHtml(lesson, f) {
    const m = f && f.msg;
    if (lesson.plain) {
      return m
        ? `<h3>Tip</h3><p>${esc(m.tip || '')}</p>`
        : `<h3>Tip</h3><p class="muted">Press Play to follow the poll from start to finish.</p>`;
    }
    if (!m) return `<h3>Message</h3><p class="muted">This step sends no message.</p>`;
    const kind = `${m.kind} · #${f.n}`;
    let html = `<h3>Message</h3><p class="msg-name">${esc(m.name)}</p><p class="msg-meta">${esc(fromName(lesson, m))} → ${esc(toName(lesson, m))} · ${esc(kind)}</p>`;
    if (m.payload !== undefined) html += `<pre class="code"><code>${highlight(JSON.stringify(m.payload, null, 2))}</code></pre>`;
    if (m.note) html += `<p class="muted">${esc(m.note)}</p>`;
    if (m.fields && m.fields.length) {
      html +=
        `<table class="fields"><thead><tr><th>Field</th><th>Meaning</th></tr></thead><tbody>` +
        m.fields.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') +
        `</tbody></table>`;
    }
    return html;
  }

  /* Step header with a persistent progress bar, so the fill can transition between steps. */
  function mountStepHead(el) {
    el.innerHTML =
      '<p class="step-count"></p><div class="progress" role="progressbar" aria-label="Step progress" aria-valuemin="1"><span></span></div><h1></h1><p></p>';
    const [count, bar, title, text] = el.children;
    return (f, built) => {
      const total = built.steps.length;
      const s = built.steps[f.step];
      count.textContent = `Step ${f.step + 1} of ${total}`;
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuenow', String(f.step + 1));
      bar.firstElementChild.style.inlineSize = `${((f.step + 1) / total) * 100}%`;
      title.textContent = s.title;
      text.textContent = s.text;
    };
  }

  /* Player toolbar shared by home and lesson canvases. */
  const canvasBar = ({ reset = false, hint = false } = {}) =>
    `<div class="canvas-bar"><button type="button" class="btn sm" id="prev" disabled>◂ Prev</button><button type="button" class="btn sm primary" id="play">▶ Play</button><button type="button" class="btn sm" id="step">Step ▸</button>${reset ? '<button type="button" class="btn sm" id="reset">Reset</button>' : ''}${hint ? '<span class="keys-hint">← → step · space play</span>' : ''}</div>`;

  function bindBar(player, pauseOnNav) {
    const nav = (fn) => () => {
      if (pauseOnNav) player.pause();
      fn();
    };
    $('#play').addEventListener('click', () => player.toggle());
    $('#prev').addEventListener('click', nav(() => player.prev()));
    $('#step').addEventListener('click', nav(() => player.next()));
    const reset = $('#reset');
    if (reset) reset.addEventListener('click', () => player.reset());
  }

  const setPlayLabel = (on) => {
    $('#play').textContent = on ? '❚❚ Pause' : '▶ Play';
  };

  const syncBar = (f, built) => {
    $('#prev').disabled = f.step <= 0;
    $('#step').disabled = f.step >= built.steps.length - 1;
  };

  /* ---------- views ---------- */
  let current = null;

  function teardown() {
    if (current) current.player.destroy();
    current = null;
  }

  function setNavMark(id) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === 'use' ? id === 'use' : !!id && id !== 'use';
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function renderHome() {
    teardown();
    setNavMark('');
    const lesson = LP.lessons.vote;
    view.innerHTML = `
      <div class="home">
        <section class="home-left">
          <h1>How LivePoll works</h1>
          <p class="lede">A presenter asks a question. Phones answer. The bars on the big screen grow while people vote. Behind that sit a few small parts, and this tour walks through each one.</p>
          <dl class="glossary">${LP.glossary.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
          <a class="btn primary" href="#/edge">Start the tour</a>
          <p class="jump"><span class="muted">or jump to</span>${LP.jump.map(([id, t]) => `<a href="#/${id}">${esc(t)}</a>`).join('')}</p>
        </section>
        <section class="home-right">
          <header class="step-head" id="step-head"></header>
          <div class="canvas"><div class="canvas-view"><svg id="stage" role="img" aria-label="Animated diagram of a live vote"></svg></div>${canvasBar()}</div>
        </section>
      </div>`;
    const renderHead = mountStepHead($('#step-head'));
    const player = createPlayer(
      lesson,
      $('#stage'),
      {
        onBuilt() {},
        onPlay: setPlayLabel,
        onFrame(f, i, built) {
          renderHead(f, built);
          syncBar(f, built);
        },
      },
      { loop: true },
    );
    current = { id: '', player };
    bindBar(player, true);
    player.play();
  }

  function renderLesson(id, stepN) {
    teardown();
    setNavMark(id);
    const lesson = LP.lessons[id];
    const nav = LP.groups
      .map(
        (g) => `
        <div class="nav-group"><h2>${esc(g.title)}</h2><ul class="nav-list">${g.ids
          .map((lid) => {
            const l = LP.lessons[lid];
            const on = lid === id;
            return `<li class="nav-item"${on ? ' aria-current="true"' : ''}><a href="#/${lid}"><span class="nav-title">${esc(l.title)}</span><span class="nav-sub">${esc(l.subtitle)}</span></a>${on ? '<ol class="steps" id="steps"></ol>' : ''}</li>`;
          })
          .join('')}</ul></div>`,
      )
      .join('');
    const tools = lesson.scene.single
      ? `<div class="canvas-tools"><div class="seg" role="group" aria-label="Server instances"><button type="button" data-n="1" aria-pressed="false">1 instance</button><button type="button" data-n="2" aria-pressed="true">2 instances</button></div></div>`
      : lesson.regionPick
        ? `<div class="canvas-tools"><span class="hint">Click a region to follow it</span></div>`
        : '';
    const c = lesson.concept;
    view.innerHTML = `
      <div class="lesson">
        <nav class="nav" aria-label="Lessons"><div class="nav-groups">${nav}</div></nav>
        <div class="main">
          <header class="step-head" id="step-head"></header>
          <div class="canvas">${tools}<div class="canvas-view"><svg id="stage" role="img" aria-label="Diagram: ${esc(lesson.title)}"></svg></div>${canvasBar({ reset: true, hint: true })}</div>
          <section aria-labelledby="flow-h">
            <div class="flow-bar">
              <div><h2 id="flow-h">${lesson.plain ? 'What happens' : 'Message flow'}</h2><p class="count" id="count"></p></div>
            </div>
            <div class="table-wrap"><table class="flow"><thead><tr id="thead"></tr></thead><tbody id="rows"></tbody></table></div>
          </section>
        </div>
        <aside class="side">
          <section class="card concept">
            <h2>${esc(c.title)}</h2>
            <p class="sub">${esc(c.subtitle)}</p>
            <p>${esc(c.paragraph)}</p>
            ${c.repo.length ? `<h3>In the repo</h3><ul class="repo">${c.repo
              .map((p) => {
                const k = p.lastIndexOf('/');
                return `<li title="${esc(p)}"><code class="file">${esc(p.slice(k + 1))}</code>${k > 0 ? `<code class="dir">${esc(p.slice(0, k))}</code>` : ''}</li>`;
              })
              .join('')}</ul>` : ''}
          </section>
          <section class="card inspector${lesson.plain ? ' tip' : ''}" id="inspector" aria-live="polite"></section>
        </aside>
      </div>`;

    const renderHead = mountStepHead($('#step-head'));
    const rowsEl = $('#rows');
    const labels = lesson.plain ? ['#', 'Who', 'What happens'] : ['#', 'From', 'To', 'Method', 'Info'];
    $('#thead').innerHTML = labels.map((l) => `<th>${l}</th>`).join('');
    const label = (l) => ` data-label="${l}"`;

    const hooks = {
      onBuilt(built) {
        $('#steps').innerHTML = built.steps
          .map((s, i) => `<li><a href="#/${id}/step-${i + 1}" data-s="${i}"><span class="dot">${i + 1}</span><span>${esc(s.title)}</span></a></li>`)
          .join('');
        $('#count').textContent = `${plural(built.rows.length, 'message')} · ${plural(built.steps.length, 'step')}`;
        rowsEl.innerHTML = built.rows
          .map((f) => {
            const m = f.msg;
            const cells = lesson.plain
              ? `<td${label(labels[1])}>${esc(m.who || fromName(lesson, m))}</td><td${label(labels[2])}>${esc(m.info)}</td>`
              : `<td${label(labels[1])}>${esc(fromName(lesson, m))}</td><td${label(labels[2])}>${esc(toName(lesson, m))}</td><td${label(labels[3])}><code>${esc(m.name)}</code></td><td${label(labels[4])}>${esc(m.info)}</td>`;
            return `<tr data-i="${f.i}" tabindex="0"><td><span class="num">${f.n}</span></td>${cells}</tr>`;
          })
          .join('');
      },
      onPlay: setPlayLabel,
      onFrame(f, i, built, ctx) {
        renderHead(f, built);
        document.querySelectorAll('#steps a').forEach((a) => {
          if (+a.dataset.s === f.step) a.setAttribute('aria-current', 'step');
          else a.removeAttribute('aria-current');
        });
        rowsEl.querySelectorAll('tr').forEach((tr) => tr.classList.toggle('current', +tr.dataset.i === i));
        $('#inspector').innerHTML = inspectorHtml(lesson, f);
        syncBar(f, built);
        document.querySelectorAll('[data-n]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === ctx.instances)));
        history.replaceState(null, '', `#/${id}/step-${f.step + 1}`);
      },
    };

    const player = createPlayer(lesson, $('#stage'), hooks);
    current = { id, player };

    bindBar(player, false);
    const pickRow = (e) => {
      const tr = e.target.closest('tr[data-i]');
      if (!tr || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      player.pause();
      player.show(+tr.dataset.i, true);
    };
    rowsEl.addEventListener('click', pickRow);
    rowsEl.addEventListener('keydown', pickRow);
    document.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => player.setCtx({ instances: +b.dataset.n })));

    player.start();
    player.goStep(stepN);
  }

  /* ---------- routing and keys ---------- */
  function parse() {
    const m = location.hash.match(/^#\/?([a-z]*)(?:\/step-(\d+))?\/?$/);
    const id = m && LP.lessons[m[1]] ? m[1] : '';
    return { id, step: m && m[2] ? +m[2] - 1 : 0 };
  }

  function route() {
    const r = parse();
    if (r.id && current && current.id === r.id) {
      current.player.goStep(r.step);
      return;
    }
    if (r.id) renderLesson(r.id, r.step);
    else renderHome();
    window.scrollTo(0, 0);
  }

  document.addEventListener('keydown', (e) => {
    if (!current || !current.id || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input,textarea,select')) return;
    const p = current.player;
    if (e.key === 'ArrowRight') p.next();
    else if (e.key === 'ArrowLeft') p.prev();
    else if (e.key === ' ' && !e.target.closest('button,a,[role="button"],tr')) p.toggle();
    else if (e.key === 'r') p.reset();
    else return;
    e.preventDefault();
  });

  window.addEventListener('hashchange', route);
  initChrome();
  route();
})();
