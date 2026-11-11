(() => {
'use strict';
const app = document.getElementById('app');
const KEY = 'codeRoute.v1';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad = n => String(n).padStart(2, '0');
const dk = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dk();
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return dk(d); };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const fmtDur = s => s < 60 ? Math.round(s) + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : Math.floor(s / 3600) + ' h ' + pad(Math.round(s % 3600 / 60));
const longDate = k => new Date(k + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ── Données ──
const QS = QUESTIONS.map(a => ({ id: hash(a[1] + '|' + a[2][0] + '|' + (a[5] || '')), t: a[0], q: a[1], a: a[2], c: a[3], e: a[4], s: a[5] }));
const SQ = Object.keys(SIGNS).map(k => ({ id: 'sg_' + k, t: 'X', q: 'Que signifie ce panneau ?', s: k, sign: true, e: SIGNS[k].d }));
const ALL = QS.concat(SQ);

// ── État (localStorage) ──
const def = () => ({ q: {}, days: {}, sessions: [], exams: [], read: {}, goal: 30, timer: 30, len: 10 });
let S = def();
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.q && s.days) S = Object.assign(def(), s); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const day = k => S.days[k] || (S.days[k] = { n: 0, ok: 0, sec: 0 });

function record(q, ok) {
  const st = S.q[q.id] || (S.q[q.id] = { n: 0, ok: 0, box: 0, due: '' });
  st.n++; st.last = ok ? 1 : 0;
  if (ok) { st.ok++; st.box = Math.min(5, st.box + 1); st.due = addDays(today(), [1, 1, 3, 7, 14, 30][st.box]); }
  else { st.box = 0; st.due = today(); }
  const d = day(today()); d.n++; if (ok) d.ok++;
  save();
}
// Priorité de révision : erreurs, à revoir, jamais vues, puis le reste
function prio(q) {
  const st = S.q[q.id];
  if (!st) return 2;
  if (!st.last) return 0;
  if (st.due <= today()) return 1;
  return 3 + st.box;
}
const pick = (pool, n) => { const p = shuffle(pool).sort((a, b) => prio(a) - prio(b)); return n ? p.slice(0, n) : p; };
const seen = q => !!S.q[q.id];
const mastered = q => S.q[q.id] && S.q[q.id].box >= 2;
const errorsList = () => ALL.filter(q => S.q[q.id] && !S.q[q.id].last);
const dueList = () => QS.filter(q => S.q[q.id] && S.q[q.id].last && S.q[q.id].due <= today());

function streak() {
  let k = today(), n = 0;
  if (!(S.days[k] && S.days[k].n)) k = addDays(k, -1);
  while (S.days[k] && S.days[k].n) { n++; k = addDays(k, -1); }
  return n;
}
function bestStreak() {
  const ks = Object.keys(S.days).filter(k => S.days[k].n).sort();
  let best = 0, run = 0, prev = '';
  for (const k of ks) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}

// ── Session de questions ──
let ses = null, cur = null, lastRes = null, timerId = null, tLeft = 0;
const stopTimer = () => { clearInterval(timerId); timerId = null; };

function prep(q) {
  let a = q.a, c = q.c;
  if (q.sign) {
    const others = shuffle(Object.keys(SIGNS).filter(k => k !== q.s)).slice(0, 3).map(k => SIGNS[k].n);
    a = [SIGNS[q.s].n, ...others]; c = [0];
  }
  const order = shuffle(a.map((_, i) => i));
  return { q, opts: order.map(i => a[i]), good: order.map(i => c.includes(i)) };
}
function start(mode, label, qs) {
  if (!qs.length) return toast('Aucune question disponible pour ce mode.');
  ses = { mode, label, qs: qs.map(prep), i: 0, res: [], t0: Date.now() };
  go('quiz');
}
function examQs() {
  let out = [];
  for (const t in THEMES) if (THEMES[t].k) out.push(...shuffle(QS.filter(q => q.t === t)).slice(0, THEMES[t].k));
  return shuffle(out);
}
function closeSession() {
  stopTimer();
  const n = ses.res.length;
  if (n) {
    const ok = ses.res.filter(r => r.ok).length, dur = Math.min(Math.round((Date.now() - ses.t0) / 1000), n * 120);
    const full = n === ses.qs.length;
    day(today()).sec += dur;
    S.sessions.unshift({ ts: Date.now(), d: today(), mode: ses.mode, label: ses.label + (full ? '' : ' (interrompu)'), n, ok, dur });
    S.sessions.length = Math.min(S.sessions.length, 200);
    if (ses.mode === 'exam' && full) {
      const th = {};
      ses.qs.forEach((it, i) => { const x = th[it.q.t] || (th[it.q.t] = [0, 0]); x[1]++; if (ses.res[i].ok) x[0]++; });
      S.exams.push({ ts: Date.now(), d: today(), score: ok, total: n, th });
    }
    save();
  }
  lastRes = ses; ses = null;
}

function quizView() {
  stopTimer();
  const it = ses.qs[ses.i], n = ses.qs.length, exam = ses.mode === 'exam', th = THEMES[it.q.t];
  cur = { sel: new Set(), done: false };
  app.innerHTML = `
  <div class="qhead">
    <button class="btn sm" data-act="quit">✕ Quitter</button>
    <div class="bar"><i style="width:0"></i><i style="width:${ses.i / n * 100}%"></i></div>
    <span class="small mut">${ses.i + 1}/${n}</span>
    ${exam && S.timer ? '<span class="timer" id="tm"></span>' : ''}
  </div>
  <div class="card">
    <span class="chip">${th.i} ${th.n}</span>
    ${it.q.s ? `<div class="sign">${SIGNS[it.q.s].svg}</div>` : ''}
    <div class="qtxt">${it.q.q}</div>
    <div class="small mut">${it.q.sign ? 'Une seule bonne réponse' : 'Une ou plusieurs bonnes réponses'}</div>
    ${it.opts.map((o, i) => `<button class="opt" data-act="opt" data-arg="${i}"><span class="k">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}
    <div id="fb"></div>
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn pri" id="go" data-act="validate">Valider</button></div>
  </div>
  <p class="small mut" style="text-align:center">Clavier : A B C D pour cocher, Entrée pour valider</p>`;
  if (exam && S.timer) {
    tLeft = S.timer;
    const tm = document.getElementById('tm'), show = () => { tm.textContent = tLeft + ' s'; tm.classList.toggle('low', tLeft <= 5); };
    show();
    timerId = setInterval(() => { tLeft--; show(); if (tLeft <= 0) validate(true); }, 1000);
  }
}
function toggleOpt(i) {
  if (!ses || cur.done) return;
  const b = app.querySelectorAll('.opt')[i]; if (!b) return;
  if (ses.qs[ses.i].q.sign) { cur.sel.clear(); app.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); }
  cur.sel.has(i) ? cur.sel.delete(i) : cur.sel.add(i);
  b.classList.toggle('sel', cur.sel.has(i));
}
function validate(timeout) {
  if (!ses) return;
  if (cur.done) return next();
  const it = ses.qs[ses.i], exam = ses.mode === 'exam';
  if (!cur.sel.size && !exam && timeout !== true) return toast('Choisis au moins une réponse.');
  const ok = it.good.every((g, i) => g === cur.sel.has(i));
  cur.done = true; stopTimer();
  record(it.q, ok);
  ses.res.push({ sel: [...cur.sel], ok });
  if (exam) return next();
  app.querySelectorAll('.opt').forEach((b, i) => {
    b.disabled = true; b.classList.remove('sel');
    if (it.good[i]) b.classList.add('good'); else if (cur.sel.has(i)) b.classList.add('bad');
  });
  document.getElementById('fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'ko'}"><b>${ok ? '✅ Bonne réponse !' : '❌ Mauvaise réponse'}</b>${it.q.e}</div>`;
  const g = document.getElementById('go');
  g.textContent = ses.i + 1 >= ses.qs.length ? 'Voir le résultat' : 'Question suivante →';
  g.focus();
}
function next() {
  ses.i++;
  if (ses.i >= ses.qs.length) { closeSession(); go('result'); } else quizView();
}

function reviewHtml(r) {
  return r.res.map((x, i) => {
    const it = r.qs[i];
    return `<details class="rv"${x.ok ? '' : ' open'}><summary><span>${x.ok ? '✅' : '❌'}</span><span>${i + 1}. ${it.q.q}</span></summary>
      ${it.q.s ? `<div class="sign" style="width:90px;height:90px">${SIGNS[it.q.s].svg}</div>` : ''}
      ${it.opts.map((o, j) => `<div class="opt ${it.good[j] ? 'good' : x.sel.includes(j) ? 'bad' : ''}"><span class="k">${'ABCD'[j]}</span><span>${o}${x.sel.includes(j) ? ' <span class="mut small">(ta réponse)</span>' : ''}</span></div>`).join('')}
      <div class="fb">${it.q.e}</div></details>`;
  }).join('');
}
function result() {
  const r = lastRes, n = r.res.length, ok = r.res.filter(x => x.ok).length, exam = r.mode === 'exam';
  const pass = ok / n >= 0.875, wrong = n - ok;
  let th = '';
  if (exam) {
    const m = {};
    r.qs.forEach((it, i) => { const x = m[it.q.t] || (m[it.q.t] = [0, 0]); x[1]++; if (r.res[i] && r.res[i].ok) x[0]++; });
    th = `<div class="card"><h2>Détail par thème</h2><table>${Object.keys(m).map(t => `<tr><td>${THEMES[t].i} ${THEMES[t].n}</td><td><b>${m[t][0]}/${m[t][1]}</b></td></tr>`).join('')}</table></div>`;
  }
  app.innerHTML = `
  <div class="card" style="text-align:center">
    <p class="mut">${esc(r.label)}</p>
    <div class="score ${pass ? 'pass' : exam ? 'fail' : ''}">${ok}<span style="font-size:1.4rem"> / ${n}</span></div>
    <p style="margin-top:10px">${exam
      ? (pass ? '🎉 <b>Examen réussi !</b> Il faut 35/40 le jour J : tu y es.' : `<b>Examen non validé.</b> Il faut au moins 35/40 — encore ${Math.max(0, Math.ceil(n * 0.875) - ok)} bonne(s) réponse(s) à gagner.`)
      : (wrong ? `${pct(ok, n)} % de réussite. Les questions ratées reviendront en priorité.` : 'Sans faute, bravo ! 👏')}</p>
    <div class="row" style="justify-content:center;margin-top:14px">
      ${wrong ? '<button class="btn pri" data-act="redo">Refaire mes erreurs</button>' : ''}
      <button class="btn" data-act="smart">Nouvelle série</button>
      <a class="btn" href="#home">Accueil</a>
    </div>
  </div>
  ${th}
  <div class="card"><h2>Correction</h2>${reviewHtml(r)}</div>`;
}

// ── Accueil ──
function themeRows() {
  return Object.keys(THEMES).filter(t => t !== 'X').map(t => {
    const qs = QS.filter(q => q.t === t), s = qs.filter(seen).length, m = qs.filter(mastered).length;
    return `<button class="theme" data-act="theme" data-arg="${t}"><div class="row"><span>${THEMES[t].i}</span><span class="tn">${THEMES[t].n}</span><span class="small mut">${m}/${qs.length} maîtrisées</span></div>
      <div class="bar"><i style="width:${pct(s, qs.length)}%"></i><i style="width:${pct(m, qs.length)}%"></i></div></button>`;
  }).join('');
}
function home() {
  const t = today(), d = S.days[t] || { n: 0, ok: 0 }, p = Math.min(1, d.n / S.goal), C = 251.3;
  let n7 = 0, ok7 = 0, week = '';
  for (let i = 6; i >= 0; i--) {
    const k = addDays(t, -i), x = S.days[k] || { n: 0, ok: 0 }; n7 += x.n; ok7 += x.ok;
    week += `<div class="${x.n >= S.goal ? 'd2' : x.n ? 'd1' : ''}${i ? '' : ' now'}" title="${longDate(k)}">${'DLMMJVS'[new Date(k + 'T12:00:00').getDay()]}<b>${x.n || '·'}</b></div>`;
  }
  const ex = S.exams.slice(-3), avg = ex.length ? ex.reduce((a, e) => a + e.score * 40 / e.total, 0) / ex.length : 0;
  const ready = !ex.length ? 'aucun examen blanc' : avg >= 35 ? 'prêt pour le jour J 🎉' : avg >= 31 ? 'presque prêt' : 'à renforcer';
  const err = errorsList().length, due = dueList().length, st = streak();
  const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];
  app.innerHTML = `
  ${ses ? `<div class="card row sp"><div><b>Session en cours</b><div class="small mut">${esc(ses.label)} — question ${ses.i + 1}/${ses.qs.length}</div></div><div class="row"><button class="btn pri" data-act="resume">Reprendre</button><button class="btn ko" data-act="abandon">Abandonner</button></div></div>` : ''}
  <div class="card row">
    <svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="50" cy="50" r="40" fill="none" stroke="${p >= 1 ? 'var(--ok)' : 'var(--pri)'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">${d.n}</text></svg>
    <div style="flex:1;min-width:200px">
      <h1>${p >= 1 ? 'Objectif du jour atteint 👏' : d.n ? 'Continue comme ça !' : st ? 'Prêt pour ta séance du jour ?' : 'Bienvenue, on commence ?'}</h1>
      <p class="mut">${d.n} / ${S.goal} questions aujourd'hui${d.n ? ` · ${pct(d.ok, d.n)} % de réussite` : ''}${due + err ? ` · ${due + err} à revoir` : ''}</p>
      <div class="row"><button class="btn pri" data-act="smart">▶ Révision intelligente</button><button class="btn" data-act="exam">📝 Examen blanc</button></div>
    </div>
  </div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="tile"><b>🔥 ${st}</b><small>jour${st > 1 ? 's' : ''} d'affilée</small></div>
    <div class="tile"><b>${pct(QS.filter(mastered).length, QS.length)} %</b><small>du programme maîtrisé</small></div>
    <div class="tile"><b>${n7 ? pct(ok7, n7) + ' %' : '—'}</b><small>réussite sur 7 jours</small></div>
    <div class="tile"><b>${ex.length ? avg.toFixed(1).replace('.', ',') + '/40' : '—'}</b><small>examens : ${ready}</small></div>
  </div>
  <div class="card"><div class="row sp"><h2>Ma semaine</h2><a class="small" href="#suivi">Tout le suivi →</a></div><div class="week">${week}</div></div>
  <div class="card tip"><b>💡 Astuce du jour</b><p style="margin:4px 0 0">${tip}</p></div>
  <div class="card"><h2>Progression par thème</h2><p class="small mut">Clique sur un thème pour lancer une série. Barre claire : questions vues · barre verte : maîtrisées.</p>${themeRows()}</div>`;
}

// ── S'entraîner ──
function train() {
  const err = errorsList().length, due = dueList().length, unseen = QS.filter(q => !seen(q)).length;
  const opt = (v, l, c) => `<option value="${v}"${c == v ? ' selected' : ''}>${l}</option>`;
  app.innerHTML = `
  <h1>S'entraîner</h1><p class="mut">${QS.length} questions réparties sur les 10 thèmes officiels, plus un thème bonus boîte manuelle.</p>
  <div class="grid g2" style="margin-bottom:16px">
    <button class="btn big pri" data-act="smart">▶ Révision intelligente<small>20 questions choisies pour toi : ${err} erreur(s), ${due} à revoir, ${unseen} jamais vues</small></button>
    <button class="btn big" data-act="quick">⚡ Série rapide<small>10 questions au hasard, 3 minutes</small></button>
    <button class="btn big" data-act="errors">🔁 Mes erreurs<small>${err ? err + ' question(s) ratée(s) à corriger' : 'Aucune erreur en attente 🎉'}</small></button>
    <button class="btn big" data-act="signquiz">🛑 Quiz panneaux<small>10 panneaux à reconnaître</small></button>
  </div>
  <div class="card">
    <h2>📝 Examen blanc</h2>
    <p>40 questions comme le jour de l'épreuve, réparties par thème. Pas de correction avant la fin. <b>35 bonnes réponses</b> pour réussir.</p>
    <div class="row"><label class="small mut">Chrono par question <select data-set="timer">${opt(20, '20 secondes', S.timer)}${opt(30, '30 secondes', S.timer)}${opt(0, 'Sans chrono', S.timer)}</select></label>
    <button class="btn pri" data-act="exam">Lancer l'examen blanc</button></div>
  </div>
  <div class="card">
    <div class="row sp"><h2>Par thème</h2><label class="small mut">Longueur <select data-set="len">${opt(10, '10 questions', S.len)}${opt(20, '20 questions', S.len)}${opt(0, 'Tout le thème', S.len)}</select></label></div>
    ${themeRows()}
  </div>`;
}

// ── Cours ──
function distHtml(v) {
  const d = v / 10, re = d * 3, sec = d * d, mou = sec * 1.5, secu = d * 6, max = 260;
  const row = (l, x, c) => `<span>${l}</span><div class="bar"><i style="width:${Math.min(100, x / max * 100)}%;background:${c}"></i></div><b>${Math.round(x)} m</b>`;
  return `<p><b>${v} km/h</b></p><div class="dist">${row('Réaction (1 s)', re, 'var(--warn)')}${row('Arrêt sur sec', sec, 'var(--pri)')}${row('Arrêt sur mouillé', mou, 'var(--ko)')}${row('Distance de sécurité', secu, 'var(--ok)')}</div>`;
}
function cours() {
  let h = '';
  for (const t in THEMES) {
    const fs = COURS.map((c, i) => [c, i]).filter(x => x[0].t === t);
    if (!fs.length) continue;
    h += `<div class="card"><div class="row sp"><h2>${THEMES[t].i} ${THEMES[t].n}</h2><button class="btn sm" data-act="theme" data-arg="${t}">S'entraîner</button></div>
      ${fs.map(([c, i]) => `<details data-read="${i}"><summary><span>${S.read[i] ? '✅' : '📄'}</span>${c.titre}</summary><ul>${c.pts.map(p => `<li>${p}</li>`).join('')}</ul></details>`).join('')}</div>`;
  }
  app.innerHTML = `
  <h1>Cours</h1><p class="mut">L'essentiel à retenir, thème par thème. Une fiche ouverte est marquée comme lue.</p>
  <div class="card"><h2>📏 Calculateur de distances</h2>
    <input type="range" id="spd" min="30" max="130" step="10" value="90" aria-label="Vitesse">
    <div id="dist">${distHtml(90)}</div>
    <p class="small mut" style="margin-top:10px">Formules à retenir pour l'examen : réaction = dizaine × 3 · arrêt = dizaine × dizaine (× 1,5 sur mouillé) · sécurité = dizaine × 6.</p>
  </div>
  <div class="card"><h2>🎓 L'examen en bref</h2><ul style="margin:0;padding-left:20px">
    <li>40 questions à choix multiples, sur tablette, dans un centre agréé (environ 30 €).</li>
    <li>Une ou plusieurs bonnes réponses par question : il faut toutes les cocher.</li>
    <li>Réussite à partir de <b>35/40</b>. Le code reste valable 5 ans.</li>
    <li>Inscription possible dès 15 ans (conduite accompagnée) ; il faut un numéro NEPH.</li></ul></div>
  ${h}`;
}

// ── Panneaux ──
function signsView() {
  const fam = [['Danger (triangle)', 'Annonce un danger : on redouble de vigilance et on ralentit.'], ['Interdiction (rond rouge)', 'Interdit quelque chose à partir du panneau.'], ['Obligation (rond bleu)', 'Impose un comportement.'], ['Indication (carré bleu)', 'Donne une information utile.']];
  app.innerHTML = `
  <h1>Panneaux</h1><p class="mut">La forme et la couleur donnent déjà la famille du panneau.</p>
  <div class="grid g4" style="margin-bottom:16px">${fam.map(f => `<div class="tile"><h3>${f[0]}</h3><small>${f[1]}</small></div>`).join('')}</div>
  <p><button class="btn pri" data-act="signquiz">▶ Quiz panneaux (10)</button></p>
  <div class="signs">${Object.keys(SIGNS).map(k => `<div class="tile" title="${esc(SIGNS[k].d)}">${SIGNS[k].svg}<div><b style="font-size:.9rem;display:inline">${SIGNS[k].n}</b></div><small>${SIGNS[k].d}</small></div>`).join('')}</div>`;
}

// ── Suivi ──
let cal = { y: new Date().getFullYear(), m: new Date().getMonth() };
function calHtml() {
  const first = new Date(cal.y, cal.m, 1), off = (first.getDay() + 6) % 7, nd = new Date(cal.y, cal.m + 1, 0).getDate();
  let h = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<div class="h">${x}</div>`).join(''), worked = 0;
  for (let i = 0; i < off; i++) h += '<button class="off" disabled></button>';
  for (let d = 1; d <= nd; d++) {
    const k = cal.y + '-' + pad(cal.m + 1) + '-' + pad(d), n = S.days[k] ? S.days[k].n : 0;
    if (n) worked++;
    h += `<button class="${!n ? '' : n >= S.goal ? 'l3' : n >= S.goal / 2 ? 'l2' : 'l1'}${k === today() ? ' now' : ''}" data-act="day" data-arg="${k}">${d}</button>`;
  }
  return `<div class="row sp" style="margin-bottom:10px"><button class="btn sm" data-act="calPrev">←</button><b style="text-transform:capitalize">${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b><button class="btn sm" data-act="calNext">→</button></div>
    <div class="cal">${h}</div>
    <div class="legend"><span><i style="background:var(--bg);border:1px solid var(--line)"></i>pas de révision</span><span><i style="background:#c9d6ff"></i>un peu</span><span><i style="background:#7fa0ff"></i>la moitié de l'objectif</span><span><i style="background:var(--ok)"></i>objectif atteint</span></div>
    <p class="small" id="dayinfo" style="margin:10px 0 0"><b>${worked}</b> jour(s) travaillé(s) ce mois-ci. Clique sur un jour pour le détail.</p>`;
}
function dayInfo(k) {
  const x = S.days[k];
  document.getElementById('dayinfo').innerHTML = `<b>${longDate(k)}</b> : ` + (x && x.n ? `${x.n} questions · ${pct(x.ok, x.n)} % de réussite · ${fmtDur(x.sec || 0)} de travail` : 'pas de révision ce jour-là.');
}
function barChart() {
  const W = 600, H = 150, t = today(), ds = [];
  for (let i = 29; i >= 0; i--) { const k = addDays(t, -i); ds.push([k, S.days[k] ? S.days[k].n : 0]); }
  const max = Math.max(S.goal, ...ds.map(d => d[1])) * 1.1, y = v => H - 20 - v / max * (H - 30);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${ds.map((d, i) => `<rect x="${i * 20 + 3}" y="${y(d[1])}" width="14" height="${H - 20 - y(d[1])}" rx="3" fill="${d[1] >= S.goal ? 'var(--ok)' : 'var(--pri)'}"><title>${longDate(d[0])} : ${d[1]} questions</title></rect>${i % 5 === 4 || i === 29 ? `<text x="${i * 20 + 10}" y="${H - 5}" font-size="10" text-anchor="middle" fill="var(--mut)">${+d[0].slice(8)}/${+d[0].slice(5, 7)}</text>` : ''}`).join('')}
    <line x1="0" x2="${W}" y1="${y(S.goal)}" y2="${y(S.goal)}" stroke="var(--warn)" stroke-dasharray="5 4"/><text x="${W - 2}" y="${y(S.goal) - 4}" font-size="10" text-anchor="end" fill="var(--warn)">objectif ${S.goal}</text></svg>`;
}
function examChart() {
  const ex = S.exams.slice(-20);
  if (!ex.length) return '<p class="mut">Aucun examen blanc pour l\'instant. Lance-toi quand tu as vu la plupart des thèmes !</p>';
  const W = 600, H = 170, y = v => H - 20 - (v - 15) / 25 * (H - 35), x = i => ex.length === 1 ? W / 2 : 20 + i * (W - 40) / (ex.length - 1);
  const pts = ex.map((e, i) => [x(i), y(Math.max(15, e.score * 40 / e.total)), e]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><rect x="0" y="${y(40)}" width="${W}" height="${y(35) - y(40)}" fill="var(--ok2)"/>
    <line x1="0" x2="${W}" y1="${y(35)}" y2="${y(35)}" stroke="var(--ok)" stroke-dasharray="5 4"/><text x="4" y="${y(35) - 4}" font-size="10" fill="var(--ok)">35/40 : seuil de réussite</text>
    <polyline points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="var(--pri)" stroke-width="2.5"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${p[2].score / p[2].total >= 0.875 ? 'var(--ok)' : 'var(--ko)'}"><title>${longDate(p[2].d)} : ${p[2].score}/${p[2].total}</title></circle><text x="${p[0]}" y="${p[1] - 9}" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">${p[2].score}</text>`).join('')}</svg>`;
}
function suivi() {
  const ks = Object.keys(S.days).filter(k => S.days[k].n), tot = ks.reduce((a, k) => a + S.days[k].n, 0), ok = ks.reduce((a, k) => a + S.days[k].ok, 0), sec = ks.reduce((a, k) => a + (S.days[k].sec || 0), 0);
  const passed = S.exams.filter(e => e.score / e.total >= 0.875).length;
  app.innerHTML = `
  <h1>Suivi</h1><p class="mut">Ta régularité et tes performances, jour après jour.</p>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="tile"><b>${ks.length}</b><small>jours travaillés</small></div>
    <div class="tile"><b>🔥 ${streak()}</b><small>série en cours · record ${bestStreak()}</small></div>
    <div class="tile"><b>${tot}</b><small>questions répondues</small></div>
    <div class="tile"><b>${tot ? pct(ok, tot) + ' %' : '—'}</b><small>réussite globale</small></div>
    <div class="tile"><b>${fmtDur(sec)}</b><small>temps de travail</small></div>
    <div class="tile"><b>${passed}/${S.exams.length}</b><small>examens blancs réussis</small></div>
  </div>
  <div class="grid g2">
    <div class="card" id="calbox">${calHtml()}</div>
    <div class="card"><h2>Questions par jour (30 jours)</h2>${barChart()}</div>
  </div>
  <div class="card"><h2>Examens blancs</h2>${examChart()}</div>
  <div class="card"><h2>Progression par thème</h2>${themeRows()}</div>
  <div class="card"><h2>Dernières séances</h2>${S.sessions.length ? `<table><tr><th>Date</th><th>Séance</th><th>Score</th><th>Durée</th></tr>${S.sessions.slice(0, 25).map(s => `<tr><td>${s.d.slice(8)}/${s.d.slice(5, 7)}</td><td>${esc(s.label)}</td><td><b>${+s.ok}/${+s.n}</b></td><td>${fmtDur(+s.dur || 0)}</td></tr>`).join('')}</table>` : '<p class="mut">Aucune séance enregistrée.</p>'}</div>
  <div class="card"><h2>Réglages et sauvegarde</h2>
    <p><label>Objectif quotidien : <input type="number" min="5" max="500" step="5" value="${S.goal}" data-set="goal" data-rr="1" style="width:90px"> questions par jour</label></p>
    <p class="small mut">Ta progression est enregistrée dans ce navigateur uniquement. Exporte-la pour la sauvegarder ou la transférer sur un autre appareil.</p>
    <div class="row"><button class="btn" data-act="export">⬇ Exporter</button><button class="btn" data-act="import">⬆ Importer</button><button class="btn ko" data-act="reset">Tout effacer</button></div>
    <input type="file" id="imp" accept="application/json,.json" hidden>
  </div>`;
}

// ── Actions ──
const themeSession = t => start('theme', THEMES[t].n, pick(QS.filter(q => q.t === t), S.len));
const acts = {
  smart: () => start('smart', 'Révision intelligente', pick(QS, 20)),
  quick: () => start('quick', 'Série rapide', shuffle(QS).slice(0, 10)),
  errors: () => start('errors', 'Mes erreurs', shuffle(errorsList()).slice(0, 30)),
  signquiz: () => start('signs', 'Quiz panneaux', pick(SQ, 10)),
  exam: () => start('exam', 'Examen blanc', examQs()),
  theme: themeSession,
  redo: () => start('errors', 'Correction de mes erreurs', lastRes.qs.filter((_, i) => lastRes.res[i] && !lastRes.res[i].ok).map(it => it.q)),
  opt: i => toggleOpt(+i),
  validate: () => validate(),
  quit: () => { if (!ses.res.length || confirm('Quitter la séance ? Les réponses déjà données sont conservées.')) { closeSession(); go('home'); } },
  resume: () => go('quiz'),
  abandon: () => { closeSession(); route(); },
  calPrev: () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } document.getElementById('calbox').innerHTML = calHtml(); },
  calNext: () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } document.getElementById('calbox').innerHTML = calHtml(); },
  day: dayInfo,
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = 'code-route-' + today() + '.json'; a.click(); URL.revokeObjectURL(a.href);
  },
  import: () => document.getElementById('imp').click(),
  reset: () => { if (confirm('Effacer toute ta progression ? Cette action est définitive.')) { S = def(); save(); route(); toast('Progression effacée.'); } }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && acts[b.dataset.act]) acts[b.dataset.act](b.dataset.arg);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.set) {
    let v = Number(el.value); if (el.dataset.set === 'goal') v = Math.max(5, Math.min(500, v || 30));
    S[el.dataset.set] = v; save(); if (el.dataset.rr) route();
  }
  if (el.id === 'imp' && el.files[0]) {
    el.files[0].text().then(t => {
      const o = JSON.parse(t);
      if (!o || typeof o.q !== 'object' || typeof o.days !== 'object') throw 0;
      S = Object.assign(def(), o); save(); route(); toast('Progression importée.');
    }).catch(() => toast('Fichier invalide.'));
  }
});
document.addEventListener('input', e => { if (e.target.id === 'spd') document.getElementById('dist').innerHTML = distHtml(+e.target.value); });
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.dataset && d.dataset.read && d.open && !S.read[d.dataset.read]) { S.read[d.dataset.read] = 1; save(); d.querySelector('summary span').textContent = '✅'; }
}, true);
document.addEventListener('keydown', e => {
  if (document.body.dataset.view !== 'quiz' || !ses || e.ctrlKey || e.metaKey || e.altKey) return;
  const i = 'abcd'.indexOf(e.key.toLowerCase()), j = '1234'.indexOf(e.key);
  if (i >= 0 || j >= 0) toggleOpt(Math.max(i, j));
  else if (e.key === 'Enter') { e.preventDefault(); validate(); }
});

let toastT;
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

// ── Routeur ──
const views = { home, train, cours, signs: signsView, suivi, quiz: quizView, result };
function route() {
  stopTimer();
  let v = (location.hash || '#home').slice(1);
  if (!views[v] || (v === 'quiz' && !ses) || (v === 'result' && !lastRes)) v = 'home';
  document.body.dataset.view = v;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + v));
  views[v]();
  window.scrollTo(0, 0);
}
function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }
window.addEventListener('hashchange', route);
route();
})();
