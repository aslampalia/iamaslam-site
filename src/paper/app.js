/* ============================================================
   PAPER TRADER — vanilla JS SPA
   Hash-routed views. No frameworks, no JS dependencies.
   ============================================================ */
"use strict";

/* ---------- Config ---------- */
const API = (document.querySelector('meta[name="paper-api"]')?.content || "").trim().replace(/\/$/, "");
const STARTING_CASH_CENTS = 5000000; // $50,000.00
const POPULAR = ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMD", "META", "MSFT"];

/* ---------- Tiny utils ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const app = $("#app");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtMoney(cents) {
  const v = (cents || 0) / 100;
  const sign = v < 0 ? "−" : "";
  return sign + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtSigned(cents) {
  const v = (cents || 0) / 100;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return sign + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(p) {
  const v = Number(p) || 0;
  return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + "%";
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}
function fmtExpiry(iso) {
  // "2026-01-03" -> "Jan 3"
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const days = Math.round((dt - new Date(new Date().toDateString())) / 864e5);
    const dte = days <= 0 ? "today" : days === 1 ? "1d" : days + "d";
    return { label, dte };
  } catch { return { label: iso, dte: "" }; }
}
function humanContract(c) {
  const strike = "$" + ((c.strike_cents || 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${c.kind === "call" ? "CALL" : "PUT"} ${strike} · exp ${c.expiry}`;
}

/* ---------- API client ---------- */
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 401) {
    state.user = null;
    updateChrome();
    if (!location.hash.startsWith("#/auth")) location.hash = "#/auth";
    throw new Error("unauthorized");
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------- State ---------- */
const state = {
  user: null,           // {id, email, display_name}
  me: null,             // /auth/me payload
  positions: [],
  positionsAsOf: null,
  leaders: [],
  trade: { ticker: "SPY", expiry: null, expirations: [], contracts: [], asOf: null, underlyingCents: null, side: "calls", loading: false },
  txns: [],
  route: "auth",
};

async function requireUser() {
  if (state.user) return state.user;
  const me = await api("/auth/me");
  state.me = me;
  state.user = me.user;
  updateChrome();
  return state.user;
}

/* ---------- Chrome (nav + user chip) ---------- */
function updateChrome() {
  const logged = !!state.user;
  $("#user-chip").hidden = !logged;
  $("#logout-btn").hidden = !logged;
  if (logged) $("#user-chip").textContent = "👤 " + state.user.display_name;
  document.querySelectorAll("[data-route]").forEach(a => {
    a.classList.toggle("active", a.dataset.route === state.route);
  });
}
$("#logout-btn").addEventListener("click", async () => {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
  state.user = null; state.me = null; state.positions = [];
  updateChrome();
  location.hash = "#/auth";
});

/* ---------- Shared components ---------- */
function delayedSticker() {
  return `<span class="sticker delayed">⏱ delayed ~15 min</span>`;
}
function pnlBadge(pnlCents, pct) {
  const cls = pnlCents > 0 ? "up" : pnlCents < 0 ? "down" : "";
  const pctTxt = pct != null ? ` <span style="opacity:.75">${fmtPct(pct)}</span>` : "";
  return `<span class="badge ${cls}">${fmtSigned(pnlCents)}${pctTxt}</span>`;
}
function loadingCard(msg = "Loading…") {
  return `<div class="card state-card"><div class="spinner"></div><p class="mono" style="font-weight:700">${esc(msg)}</p></div>`;
}
function errorCard(msg, retry) {
  return `<div class="card state-card">
    <div class="big">🛠️</div><h2>Something broke</h2>
    <p>${esc(msg)}</p>
    ${retry ? `<button class="btn btn-flame" data-retry="${retry}">Try again</button>` : ""}
  </div>`;
}
function emptyCard(emoji, title, text, ctaHref, ctaText) {
  return `<div class="card state-card">
    <div class="big">${emoji}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>
    ${ctaHref ? `<a class="btn btn-lime" href="${ctaHref}">${esc(ctaText)}</a>` : ""}
  </div>`;
}
function toast(msg, kind = "") {
  const zone = $("#toast-zone");
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = (kind === "ok" ? "✅ " : kind === "err" ? "⛔ " : "ℹ️ ") + esc(msg);
  zone.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 3600);
}

/* ---------- Confetti (~30 lines, no deps) ---------- */
function confettiBurst(x, y, n = 110) {
  const c = $("#confetti"), ctx = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const colors = ["#FF5A1F", "#2447FF", "#C6F324", "#7B2FF7", "#FF2D8F", "#00BFA6", "#FFC700"];
  const ps = Array.from({ length: n }, () => ({
    x, y, vx: (Math.random() - 0.5) * 15, vy: Math.random() * -11 - 3, g: 0.45,
    s: Math.random() * 9 + 5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    c: colors[(Math.random() * colors.length) | 0], life: 1,
  }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr; p.life -= 0.011;
      ctx.save(); ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      ctx.restore();
    }
    if (++f < 170) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

/* ---------- Animated count-up ---------- */
function countUp(el, toCents, { dur = 900, money = true } = {}) {
  const from = parseFloat(el.dataset.v || "0");
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - k, 3);
    const v = from + (toCents - from) * e;
    el.textContent = money ? fmtMoney(Math.round(v)) : fmtSigned(Math.round(v));
    el.dataset.v = v;
    if (k < 1) requestAnimationFrame(step); else el.dataset.v = toCents;
  })(t0);
}

/* ---------- Allocation donut (SVG) ---------- */
function donutSVG(items, size = 150) {
  // items: [{label, value_cents, color}]
  const total = items.reduce((s, i) => s + i.value_cents, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let offset = 25;
  const segs = items.map(it => {
    const frac = it.value_cents / total;
    const len = frac * C;
    const s = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${it.color}" stroke-width="22"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
      stroke-dashoffset="${(-offset * C / 100).toFixed(2)}" stroke-linecap="butt"/>`;
    offset += frac * 100;
    return s;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 150 150" role="img" aria-label="Allocation">
    <circle cx="75" cy="75" r="${R}" fill="none" style="stroke:var(--paper-3)" stroke-width="22"/>${segs}</svg>`;
}

/* ---------- Router ---------- */
const routes = {
  auth: renderAuth,
  dashboard: renderDashboard,
  trade: renderTrade,
  history: renderHistory,
  leaderboard: renderLeaderboard,
};
function currentRoute() {
  const h = location.hash.replace(/^#\/?/, "").split("?")[0];
  return routes[h] ? h : "dashboard";
}
async function navigate() {
  const r = currentRoute();
  state.route = r;
  updateChrome();
  window.scrollTo(0, 0);
  try {
    if (r === "auth") { await renderAuth(); return; }
    await requireUser(); // 401 -> routes to #/auth
    await routes[r]();
  } catch (e) {
    if (String(e.message).includes("unauthorized")) return; // router already redirected
    app.innerHTML = errorCard(e.message || "Unexpected error", r);
  }
}
window.addEventListener("hashchange", navigate);
document.addEventListener("click", (e) => {
  const r = e.target.closest("[data-retry]");
  if (r) navigate();
});

/* ================= AUTH ================= */
async function renderAuth() {
  if (state.user) { location.hash = "#/dashboard"; return; }
  app.innerHTML = `
  <div class="auth-grid">
    <div class="auth-hero">
      <div class="eyebrow"><span class="dot"></span> virtual money · real fun</div>
      <h1>Trade options.<br>Risk <span style="background:var(--lime);padding:0 .35rem;border:2px solid var(--ink);border-radius:.6rem;display:inline-block;transform:rotate(-2deg)">nothing.</span></h1>
      <p>Paper Trader gives you <strong>$50,000 in virtual cash</strong> to buy real option contracts
      with delayed market quotes. Learn the game, blow up the account, start over — it costs you zero dollars.</p>
      <ul class="auth-perks">
        <li>💸 $50,000 virtual cash, free forever</li>
        <li>⚡ Real option chains, delayed ~15 min</li>
        <li>🏆 Climb the leaderboard</li>
      </ul>
    </div>
    <div class="card tilt-r">
      <div class="tabs">
        <button id="tab-login" class="active">Log in</button>
        <button id="tab-signup">Sign up</button>
      </div>
      <div class="form-err" id="auth-err"></div>
      <form id="auth-form" autocomplete="on">
        <div class="field" id="f-name" hidden>
          <label for="in-name">Trader name</label>
          <input id="in-name" maxlength="20" placeholder="e.g. aslam_trades" autocomplete="username">
        </div>
        <div class="field">
          <label for="in-email">Email</label>
          <input id="in-email" type="email" required placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="field">
          <label for="in-pass">Password</label>
          <input id="in-pass" type="password" required minlength="8" placeholder="8+ characters" autocomplete="current-password">
        </div>
        <button class="btn btn-flame btn-block btn-big" type="submit" id="auth-submit">Log in 🚀</button>
      </form>
      <p style="margin-top:1rem;font-size:.8rem;color:var(--ink-70);text-align:center">
        Paper trading only — virtual money, not investment advice.
      </p>
    </div>
  </div>`;

  let mode = "login";
  const tabL = $("#tab-login"), tabS = $("#tab-signup"), fname = $("#f-name"), submit = $("#auth-submit"), err = $("#auth-err");
  const setMode = (m) => {
    mode = m;
    tabL.classList.toggle("active", m === "login");
    tabS.classList.toggle("active", m === "signup");
    fname.hidden = m === "login";
    submit.innerHTML = m === "login" ? "Log in 🚀" : "Create account 🎲";
    err.classList.remove("show");
  };
  tabL.onclick = () => setMode("login");
  tabS.onclick = () => setMode("signup");

  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    err.classList.remove("show");
    submit.disabled = true;
    const email = $("#in-email").value.trim();
    const password = $("#in-pass").value;
    try {
      const body = mode === "login"
        ? { email, password }
        : { email, password, display_name: $("#in-name").value.trim() };
      const data = mode === "login"
        ? await api("/auth/login", { method: "POST", body: JSON.stringify(body) })
        : await api("/auth/signup", { method: "POST", body: JSON.stringify(body) });
      state.user = data.user;
      state.me = null;
      updateChrome();
      toast(mode === "login" ? `Welcome back, ${data.user.display_name}!` : "Account created — $50,000 virtual cash is yours! 🎉", "ok");
      location.hash = "#/dashboard";
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.add("show");
    } finally {
      submit.disabled = false;
    }
  });
}

/* ================= DASHBOARD ================= */
async function renderDashboard() {
  app.innerHTML = loadingCard("Counting your virtual millions…");
  try {
    const [me, pos] = await Promise.all([api("/auth/me"), api("/positions")]);
    state.me = me; state.user = me.user;
    state.positions = pos.positions || [];
    state.positionsAsOf = pos.as_of;
    updateChrome();
  } catch (e) { throw e; }

  const me = state.me;
  const pnl = me.total_equity_cents - STARTING_CASH_CENTS;
  const positions = state.positions;

  // Ticker tape of holdings
  const tapeItems = positions.length
    ? positions.map(p => {
        const cls = p.pnl_cents >= 0 ? "pos" : "neg";
        return `<span class="tape-item">${esc(p.underlying)} <span class="${cls}">${fmtSigned(p.pnl_cents)}</span></span>`;
      }).join('<span class="tape-item">✦</span>')
    : `<span class="tape-item">no positions yet — go make some paper money ✦</span>`;

  // Position cards
  const maxAbs = Math.max(1, ...positions.map(p => Math.abs(p.pnl_cents)));
  const posCards = positions.map((p, i) => {
    const pctW = Math.min(50, (Math.abs(p.pnl_cents) / maxAbs) * 50);
    const fillCls = p.pnl_cents >= 0 ? "gain" : "loss";
    const tilt = i % 2 ? "tilt-r" : "tilt-l";
    return `<div class="card pop pos-card ${tilt}">
      ${p.suspended ? `<div class="suspend-banner">⚠️ corporate action — trading paused on ${esc(p.underlying)}</div>` : ""}
      <div class="pos-top">
        <span class="pos-symbol">${esc(p.underlying)}</span>
        <span class="badge ${p.kind}">${p.kind.toUpperCase()}</span>
        ${pnlBadge(p.pnl_cents, p.pnl_pct)}
      </div>
      <div class="pos-desc">${humanContract(p)} · ${p.qty} contract${p.qty > 1 ? "s" : ""}</div>
      <div class="pos-nums">
        <div><small>Avg cost</small>${fmtMoney(p.avg_cost_cents)}</div>
        <div><small>Mark</small>${fmtMoney(p.mark_cents)}</div>
        <div><small>Value</small>${fmtMoney(p.value_cents)}</div>
      </div>
      <div class="pnl-track"><div class="pnl-mid"></div><div class="pnl-fill ${fillCls}" style="width:${pctW}%"></div></div>
      <div class="pos-actions">
        <a class="btn btn-ghost" href="#/trade" data-trade-ticker="${esc(p.underlying)}">Trade ${esc(p.underlying)}</a>
      </div>
    </div>`;
  }).join("");

  // Allocation donut by underlying
  const byUnder = {};
  positions.forEach(p => { byUnder[p.underlying] = (byUnder[p.underlying] || 0) + p.value_cents; });
  const palette = ["#FF5A1F", "#2447FF", "#C6F324", "#7B2FF7", "#FF2D8F", "#00BFA6", "#FFC700"];
  const alloc = Object.entries(byUnder).sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([label, value_cents], i) => ({ label, value_cents, color: palette[i % palette.length] }));
  const totalAlloc = alloc.reduce((s, a) => s + a.value_cents, 0);
  const legend = alloc.map(a => `<li><span class="sw" style="background:${a.color}"></span>${esc(a.label)}
    <span class="pct">${(a.value_cents / totalAlloc * 100).toFixed(1)}%</span></li>`).join("");

  // Leaderboard preview (top 5)
  let leaders = [];
  try { leaders = (await api("/leaderboard")).leaders.slice(0, 5); } catch { /* non-fatal */ }
  const lbPrev = leaders.map((l, i) => `
    <div class="lb-row ${l.display_name === me.user.display_name ? "you" : ""}">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${esc(l.display_name)}</span>
      <span class="badge ${l.return_pct >= 0 ? "up" : "down"}">${fmtPct(l.return_pct)}</span>
    </div>`).join("");

  app.innerHTML = `
  <div class="view-head">
    <div>
      <div class="eyebrow"><span class="dot"></span> your paper portfolio</div>
      <h1>Hey, ${esc(me.user.display_name)} 👋</h1>
    </div>
    <a class="btn btn-cobalt btn-big" href="#/trade">⚡ Trade</a>
  </div>

  <div class="hero">
    ${delayedSticker()}
    <div class="hero-label">Total equity · virtual</div>
    <div class="hero-equity mono" id="hero-equity" data-v="0">$0.00</div>
    <div class="hero-row">
      <div><span class="hero-label">P&amp;L</span><div class="hero-pnl mono" id="hero-pnl" data-v="0"></div></div>
      <div class="hero-stat"><small>Cash</small><span id="hero-cash">${fmtMoney(me.cash_cents)}</span></div>
      <div class="hero-stat"><small>Positions</small><span id="hero-pos">${fmtMoney(me.positions_value_cents)}</span></div>
      <div class="hero-stat"><small>Return</small><span id="hero-ret">${fmtPct(me.return_pct)}</span></div>
    </div>
  </div>

  <div class="tape" aria-hidden="true"><div class="tape-track">${tapeItems}<span class="tape-item">✦</span>${tapeItems}</div></div>

  <div class="dash-grid">
    <div>
      <h2 class="dash-sec-title">📦 Positions <span class="badge ${positions.length ? "buy" : "settle"}">${positions.length}</span></h2>
      ${positions.length ? `<div class="pos-list">${posCards}</div>`
        : emptyCard("🎲", "No positions yet", "Your $50,000 is burning a hole in your virtual pocket. Go buy your first contract.", "#/trade", "Start trading ⚡")}
    </div>
    <div style="display:grid;gap:1.5rem">
      <div class="card">
        <h2 class="dash-sec-title">🍩 Allocation</h2>
        ${alloc.length ? `<div class="donut-wrap">${donutSVG(alloc)}<ul class="donut-legend">${legend}</ul></div>${delayedSticker()}`
          : `<p style="color:var(--ink-70)">Nothing to slice yet — open a position and it shows up here.</p>`}
      </div>
      <div class="card tilt-l">
        <h2 class="dash-sec-title">🏆 Top traders</h2>
        ${lbPrev || `<p style="color:var(--ink-70)">Leaderboard is empty. Be the first legend.</p>`}
        <a class="btn btn-block" href="#/leaderboard" style="margin-top:.75rem">Full leaderboard →</a>
      </div>
    </div>
  </div>`;

  // Animate hero numbers
  countUp($("#hero-equity"), me.total_equity_cents);
  countUp($("#hero-pnl"), pnl, { money: false });

  // "Trade TICKER" shortcut remembers ticker for the trade view
  app.querySelectorAll("[data-trade-ticker]").forEach(a => {
    a.addEventListener("click", () => { state.trade.ticker = a.dataset.tradeTicker; state.trade.expiry = null; });
  });
}

/* ================= TRADE ================= */
async function renderTrade() {
  const t = state.trade;
  app.innerHTML = `
  <div class="view-head">
    <div>
      <div class="eyebrow"><span class="dot"></span> delayed ~15 min · long-only · no commissions</div>
      <h1>Trade ⚡</h1>
    </div>
    ${delayedSticker()}
  </div>

  <div class="trade-tools">
    <input class="ticker-input" id="ticker-input" placeholder="TICKER" value="${esc(t.ticker)}"
      maxlength="6" spellcheck="false" aria-label="Ticker symbol">
    <button class="btn btn-flame" id="ticker-go">Get chain</button>
  </div>
  <div class="chips" id="pop-chips">
    ${POPULAR.map(s => `<button class="chip" data-t="${s}">${s}</button>`).join("")}
  </div>

  <div id="quote-zone"></div>
  <div id="chain-zone">${loadingCard("Fetching option chain…")}</div>`;

  const input = $("#ticker-input");
  const load = (ticker) => {
    t.ticker = (ticker || "").toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 6) || "SPY";
    input.value = t.ticker;
    t.expiry = null;
    loadChain();
  };
  $("#ticker-go").onclick = () => load(input.value);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") load(input.value); });
  $("#pop-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (b) load(b.dataset.t);
  });

  await loadChain(true);
}

async function loadChain(initial = false) {
  const t = state.trade;
  const chainZone = $("#chain-zone"), quoteZone = $("#quote-zone");
  t.loading = true;
  if (!initial) chainZone.innerHTML = loadingCard("Fetching option chain…");
  try {
    const [u, chain] = await Promise.all([
      api(`/quotes/underlying/${encodeURIComponent(t.ticker)}`),
      api(`/quotes/chain/${encodeURIComponent(t.ticker)}${t.expiry ? `?expiry=${t.expiry}` : ""}`),
    ]);
    t.expirations = chain.expirations || [];
    if (!t.expiry && t.expirations.length) t.expiry = t.expirations[0];
    t.contracts = chain.contracts || [];
    t.asOf = chain.as_of;
    t.underlyingCents = chain.underlying_cents ?? u.price_cents;

    const chg = u.change_cents || 0;
    quoteZone.innerHTML = `
    <div class="card quote-card tilt-l">
      <div>
        <div class="quote-ticker">${esc(t.ticker)}</div>
        <div class="quote-price mono">${fmtMoney(u.price_cents)}</div>
      </div>
      <span class="badge ${chg >= 0 ? "up" : "down"}">${fmtSigned(chg)} · ${fmtPct(u.change_pct)}</span>
      ${delayedSticker()}
    </div>`;

    renderExpiryPills();
    renderLadder();
  } catch (e) {
    chainZone.innerHTML = errorCard(e.message, "trade");
    quoteZone.innerHTML = "";
  } finally {
    t.loading = false;
  }
}

function renderExpiryPills() {
  const t = state.trade;
  const zone = $("#chain-zone");
  // Rebuild chain zone shell with pills + side tabs + table
  zone.innerHTML = `
    <div class="expiry-pills" role="tablist" aria-label="Expirations">
      ${t.expirations.map(x => {
        const f = fmtExpiry(x);
        return `<button class="expiry-pill ${x === t.expiry ? "active" : ""}" data-exp="${x}">${f.label}<small>${f.dte} · ${x.slice(5)}</small></button>`;
      }).join("") || `<p style="color:var(--ink-70)">No expirations found.</p>`}
    </div>
    <div class="side-tabs">
      <button data-side="calls" class="${t.side === "calls" ? "active" : ""}">📈 Calls</button>
      <button data-side="puts" class="${t.side === "puts" ? "active" : ""}">📉 Puts</button>
    </div>
    <div id="ladder-zone"></div>`;

  zone.querySelectorAll("[data-exp]").forEach(b => b.onclick = () => {
    state.trade.expiry = b.dataset.exp;
    zone.querySelectorAll("[data-exp]").forEach(x => x.classList.toggle("active", x === b));
    loadChain();
  });
  zone.querySelectorAll(".side-tabs button").forEach(b => b.onclick = () => {
    state.trade.side = b.dataset.side;
    zone.querySelectorAll(".side-tabs button").forEach(x => x.classList.toggle("active", x === b));
    renderLadder();
  });
  renderLadder();
}

function renderLadder() {
  const t = state.trade;
  const zone = $("#ladder-zone");
  if (!zone) return;
  const kind = t.side === "calls" ? "call" : "put";
  const rows = t.contracts.filter(c => c.kind === kind).sort((a, b) => a.strike_cents - b.strike_cents);
  const under = t.underlyingCents || 0;

  if (!rows.length) {
    zone.innerHTML = emptyCard("🕳️", "No contracts", "Nothing listed for this expiry.", null, null);
    return;
  }
  const trs = rows.map((c, i) => {
    const itm = kind === "call" ? c.strike_cents < under : c.strike_cents > under;
    const iv = c.iv != null ? (c.iv * 100).toFixed(1) + "%" : "—";
    const delta = c.delta != null ? c.delta.toFixed(2) : "—";
    return `<tr data-idx="${i}" class="${itm ? "itm" : ""}" title="Click to trade">
      <td class="strike">$${((c.strike_cents || 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}${itm ? " ★" : ""}</td>
      <td>${fmtMoney(c.bid_cents)}</td>
      <td>${fmtMoney(c.ask_cents)}</td>
      <td>${iv}</td>
      <td class="${(c.delta || 0) < 0 ? "neg-delta" : ""}">${delta}</td>
      <td>${(c.volume ?? 0).toLocaleString("en-US")}</td>
    </tr>`;
  }).join("");

  zone.innerHTML = `
  <div class="table-scroll">
    <table class="chain">
      <thead><tr><th>Strike</th><th>Bid</th><th>Ask</th><th>IV</th><th>Δ</th><th>Vol</th></tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </div>
  <p class="mono" style="margin-top:.6rem;font-size:.72rem;color:var(--ink-70);font-weight:700">
    👆 tap a row to open the trade ticket · ★ = in the money · buys fill at ask, sells at bid
  </p>`;

  const list = rows;
  zone.querySelectorAll("tbody tr").forEach(tr => {
    tr.addEventListener("click", () => openTicket(list[+tr.dataset.idx]));
  });
}

/* ---------- Trade ticket modal ---------- */
function openModal(html) {
  $("#modal-box").innerHTML = html;
  $("#modal-veil").classList.add("open");
}
function closeModal() { $("#modal-veil").classList.remove("open"); }
$("#modal-veil").addEventListener("click", (e) => { if (e.target.id === "modal-veil") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

async function openTicket(contract) {
  // Find existing position for sell-side validation
  let held = 0;
  try {
    const pos = await api("/positions");
    state.positions = pos.positions || [];
    const p = state.positions.find(x => x.symbol === contract.symbol);
    held = p ? p.qty : 0;
  } catch { /* trade view still usable */ }

  let side = "buy";
  let qty = 1;
  const fillCents = () => side === "buy" ? contract.ask_cents : contract.bid_cents;
  const maxQty = () => side === "buy" ? 100 : Math.min(100, held);

  const render = () => {
    const total = fillCents() * 100 * qty;
    openModal(`
      <button class="modal-close" id="m-close" aria-label="Close">✕</button>
      <div class="ticket-contract">
        <div class="t-ticker">${esc(state.trade.ticker)}</div>
        <div class="t-desc">${humanContract(contract)}</div>
        <div style="margin-top:.5rem"><span class="badge ${contract.kind}">${contract.kind.toUpperCase()}</span> ${delayedSticker()}</div>
      </div>
      <div class="tabs" style="margin-bottom:1rem">
        <button id="t-buy" class="${side === "buy" ? "active" : ""}">BUY 📈</button>
        <button id="t-sell" class="${side === "sell" ? "active" : ""}" ${held ? "" : "disabled title='No position to sell'"}>SELL 📉${held ? ` (${held})` : ""}</button>
      </div>
      <div class="ticket-quotes">
        <div class="q bid"><small>Bid</small>${fmtMoney(contract.bid_cents)}</div>
        <div class="q ask"><small>Ask</small>${fmtMoney(contract.ask_cents)}</div>
      </div>
      <div class="qty-stepper">
        <button id="q-minus" aria-label="Decrease quantity">−</button>
        <div class="qty mono" id="q-val">${qty}</div>
        <button id="q-plus" aria-label="Increase quantity">+</button>
      </div>
      <div class="mono" style="text-align:center;font-size:.75rem;font-weight:700;color:var(--ink-70)">CONTRACTS (×100 shares)</div>
      <div class="ticket-total"><span>Est. ${side === "buy" ? "cost" : "proceeds"}</span><span id="t-total">${fmtMoney(total)}</span></div>
      <button class="btn ${side === "buy" ? "btn-lime" : "btn-flame"} btn-block btn-big" id="t-confirm">
        ${side === "buy" ? "BUY" : "SELL"} ${qty} × ${esc(state.trade.ticker)} ${contract.kind === "call" ? "CALL" : "PUT"} 💥
      </button>
      <p class="ticket-note">Market order · fills at ${side === "buy" ? "ask" : "bid"} · no commissions · virtual money</p>
    `);
    $("#m-close").onclick = closeModal;
    $("#t-buy").onclick = () => { side = "buy"; qty = Math.min(qty, 100); render(); };
    const sellBtn = $("#t-sell");
    if (held) sellBtn.onclick = () => { side = "sell"; qty = Math.min(qty, held); render(); };
    $("#q-minus").onclick = () => { qty = Math.max(1, qty - 1); $("#q-val").textContent = qty; refresh(); };
    $("#q-plus").onclick = () => { qty = Math.min(maxQty(), qty + 1); $("#q-val").textContent = qty; refresh(); };
    const refresh = () => {
      $("#q-val").textContent = qty;
      $("#t-total").textContent = fmtMoney(fillCents() * 100 * qty);
      const btn = $("#t-confirm");
      btn.innerHTML = `${side === "buy" ? "BUY" : "SELL"} ${qty} × ${esc(state.trade.ticker)} ${contract.kind === "call" ? "CALL" : "PUT"} 💥`;
    };
    $("#t-confirm").onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Filling… ⏳";
      try {
        const data = await api("/orders", {
          method: "POST",
          body: JSON.stringify({ symbol: contract.symbol, qty, side }),
        });
        const r = btn.getBoundingClientRect();
        confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
        toast(`${side === "buy" ? "Bought" : "Sold"} ${qty}× ${state.trade.ticker} ${contract.kind} @ ${fmtMoney(data.transaction.price_cents)}`, "ok");
        closeModal();
        loadChain(); // refresh quotes
      } catch (ex) {
        toast(ex.message, "err");
        btn.disabled = false;
        refresh();
      }
    };
  };
  render();
}

/* ================= HISTORY ================= */
async function renderHistory() {
  app.innerHTML = loadingCard("Digging up your receipts…");
  try {
    const data = await api("/transactions?limit=100");
    state.txns = data.transactions || [];
  } catch (e) { throw e; }

  const txns = state.txns;
  const typeBadge = (t) =>
    t === "BUY" ? `<span class="badge buy">BUY</span>` :
    t === "SELL" ? `<span class="badge sell">SELL</span>` :
    `<span class="badge settle">${esc(t)}</span>`;

  app.innerHTML = `
  <div class="view-head">
    <div>
      <div class="eyebrow"><span class="dot"></span> every fill, forever</div>
      <h1>History 🧾</h1>
    </div>
    <span class="badge ${txns.length ? "buy" : "settle"}">${txns.length} txn${txns.length === 1 ? "" : "s"}</span>
  </div>
  ${txns.length ? `
  <div class="table-scroll">
    <table class="hist">
      <thead><tr><th>Type</th><th>Contract</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th><th>Date</th></tr></thead>
      <tbody>
        ${txns.map(t => `
        <tr>
          <td>${typeBadge(t.type)}</td>
          <td class="sym">${esc(t.underlying || "")} ${esc(t.kind || "").toUpperCase()} $${((t.strike_cents || 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}<br>
            <span style="font-size:.72rem;color:var(--ink-45)">${esc(t.expiry || "")}</span></td>
          <td class="num">${t.qty}</td>
          <td class="num">${fmtMoney(t.price_cents)}</td>
          <td class="num">${fmtMoney(t.total_cents)}</td>
          <td class="date">${fmtDate(t.created_at)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : emptyCard("🧾", "No trades yet", "Your blotter is blank. Every fill you make lands here.", "#/trade", "Make your first trade ⚡")}`;
}

/* ================= LEADERBOARD ================= */
async function renderLeaderboard() {
  app.innerHTML = loadingCard("Ranking the legends…");
  let leaders = [];
  try { leaders = (await api("/leaderboard")).leaders || []; } catch (e) { throw e; }

  const medal = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
  app.innerHTML = `
  <div class="view-head">
    <div>
      <div class="eyebrow"><span class="dot"></span> ranked by total return · virtual money</div>
      <h1>Leaderboard 🏆</h1>
    </div>
    ${delayedSticker()}
  </div>
  ${leaders.length ? `
  <div style="max-width:44rem">
    ${leaders.map((l, i) => `
    <div class="lb-row ${state.user && l.display_name === state.user.display_name ? "you" : ""}" style="${i < 3 ? "transform:rotate(" + (i % 2 ? "0.4" : "-0.4") + "deg)" : ""}">
      <span class="lb-rank">${medal(i) || (i + 1)}</span>
      <span class="lb-name">${esc(l.display_name)} ${state.user && l.display_name === state.user.display_name ? "👈 you" : ""}</span>
      <span class="lb-eq">${fmtMoney(l.total_equity_cents)}</span>
      <span class="badge ${l.return_pct >= 0 ? "up" : "down"}">${fmtPct(l.return_pct)}</span>
    </div>`).join("")}
  </div>
  <p class="mono" style="margin-top:1rem;font-size:.75rem;color:var(--ink-70);font-weight:700">
    💡 returns are marked on delayed quotes · paper trading only, not investment advice
  </p>` : emptyCard("🏆", "Nobody's on the board", "Be the first to open an account and take the crown.", "#/trade", "Start trading ⚡")}`;
}

/* ================= BOOT ================= */
(async function boot() {
  try { await requireUserSilent(); } catch { /* stay logged out */ }
  const want = state.user ? "#/dashboard" : "#/auth";
  if (!location.hash || !routes[currentRoute()]) {
    if (location.hash !== want) location.hash = want; // hashchange fires navigate()
    else navigate();
  } else {
    navigate();
  }
})();

async function requireUserSilent() {
  try {
    const me = await fetch(API + "/auth/me", { credentials: "include" }).then(r => {
      if (!r.ok) throw new Error("nope");
      return r.json();
    });
    state.me = me;
    state.user = me.user;
    updateChrome();
  } catch { /* logged out */ }
}
