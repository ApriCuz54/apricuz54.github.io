// Small, progressive enhancements. The page reads fine without any of this.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  // Nav: show a rule and the name once the hero scrolls away.
  const top = document.querySelector(".top");
  const onScroll = () => top.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Nav: mark the section in view.
  const navLinks = [...document.querySelectorAll(".nav ul a")];
  const byId = new Map(navLinks.map(a => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const link = byId.get(e.target.id);
        if (!link) return;
        navLinks.forEach(a => a.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id], footer[id]").forEach(s => io.observe(s));

    // Bars grow once when their tile scrolls into view.
    const barIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("seen"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".bars").forEach(b => barIO.observe(b));
  } else {
    document.querySelectorAll(".bars").forEach(b => b.classList.add("seen"));
  }

  // Experience tabs (WAI-ARIA tabs pattern).
  document.querySelectorAll("[data-tabs]").forEach(root => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t, false));
      t.addEventListener("keydown", e => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key in keys) { e.preventDefault(); select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  // Work filters.
  const filterBtns = [...document.querySelectorAll("[data-filter]")];
  const tiles = [...document.querySelectorAll(".bento .tile")];
  filterBtns.forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    filterBtns.forEach(b => b.setAttribute("aria-pressed", b === btn));
    tiles.forEach(t => { t.hidden = f !== "all" && t.dataset.cat !== f; });
    tiles.filter(t => !t.hidden).forEach(t => t.querySelector(".bars")?.classList.add("seen"));
  }));


  // KV cache figure: illustrative block accounting (not measured data).
  (() => {
    const grid = document.getElementById("kv-grid");
    if (!grid) return;
    const nIn = document.getElementById("kv-n"), nOut = document.getElementById("kv-n-out");
    const pre = document.getElementById("kv-prefix");
    const readout = document.getElementById("kv-readout"), queue = document.getElementById("kv-queue");
    const TOTAL = 128, PREFIX = 6, OWN = 5;
    const cells = Array.from({ length: TOTAL }, () => grid.appendChild(document.createElement("i")));
    const render = () => {
      const n = +nIn.value, share = pre.checked;
      nOut.textContent = n;
      const perReq = share ? OWN : PREFIX + OWN;
      const base = share ? PREFIX : 0;
      const fit = Math.max(0, Math.min(n, Math.floor((TOTAL - base) / perReq)));
      const waiting = n - fit;
      let i = 0;
      const paint = (cls, alt) => { if (i < TOTAL) cells[i++].className = cls + (alt ? " alt" : ""); };
      if (share) for (let k = 0; k < PREFIX; k++) paint("p");
      for (let r = 0; r < fit; r++) {
        if (!share) for (let k = 0; k < PREFIX; k++) paint("p");
        for (let k = 0; k < OWN; k++) paint("r", r % 2);
      }
      while (i < TOTAL) cells[i++].className = "";
      const used = base + fit * perReq;
      readout.innerHTML = `<strong>${fit} running</strong>, ${waiting ? `<strong>${waiting} waiting</strong> for memory` : "none waiting"}. ${Math.round(used / TOTAL * 100)}% of the cache in use` +
        (share ? "; the shared prefix is stored once." : "; each request stores its own copy of the prefix.");
      queue.innerHTML = "<span></span>".repeat(waiting);
      grid.setAttribute("aria-label", `KV cache: ${fit} of ${n} requests fit, ${waiting} waiting, ${Math.round(used / TOTAL * 100)}% of blocks used`);
    };
    nIn.addEventListener("input", render);
    pre.addEventListener("change", render);
    render();
  })();

  // Roofline: draw the roof once, then let the pointer trace a workload along it.
  const svg = document.getElementById("roof");
  const roof = document.getElementById("roof-line");
  const dot = document.getElementById("probe-dot");
  const drop = document.getElementById("probe-drop");
  const readout = document.getElementById("roof-readout");
  if (!svg || !roof) return;

  requestAnimationFrame(() => requestAnimationFrame(() => roof.classList.add("drawn")));

  const X0 = 56, X1 = 456, RIDGE = 256, FLOOR = 280, CEIL = 80;
  const yAt = x => (x <= RIDGE ? FLOOR - (x - X0) * (FLOOR - CEIL) / (RIDGE - X0) : CEIL);
  const messages = {
    low: "Low arithmetic intensity, like a decode step at small batch: memory-bound. Faster memory or less data moved is what helps.",
    ridge: "Near the ridge point: bandwidth and compute run out at about the same time.",
    high: "High arithmetic intensity, like a large prefill GEMM: compute-bound. Better kernels and lower precision are what help."
  };
  let state = "low";
  const place = x => {
    x = Math.max(X0 + 8, Math.min(X1 - 4, x));
    const y = yAt(x);
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    drop.setAttribute("x1", x.toFixed(1));
    drop.setAttribute("x2", x.toFixed(1));
    drop.setAttribute("y1", y.toFixed(1));
    const next = Math.abs(x - RIDGE) < 22 ? "ridge" : x < RIDGE ? "low" : "high";
    if (next !== state) { state = next; readout.textContent = messages[state]; }
  };
  const toSvgX = clientX => {
    const r = svg.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 480;
  };
  svg.addEventListener("pointermove", e => place(toSvgX(e.clientX)));
  svg.addEventListener("pointerdown", e => place(toSvgX(e.clientX)));

  svg.setAttribute("tabindex", "0");
  let kx = 156;
  svg.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    kx = Math.max(X0 + 8, Math.min(X1 - 4, kx + (e.key === "ArrowRight" ? 20 : -20)));
    place(kx);
  });

  readout.textContent = messages.low;
  place(156);
});

// Agent Civilizations figure: Phase F results from agent-civ-lab (results/v2/_phase_f.md).
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; parent && parent.appendChild(e); return e; };
  let tip = document.querySelector(".tip");
  if (!tip) { tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
  const showTip = (e, html) => { tip.innerHTML = html; tip.style.opacity = 1; tip.style.left = Math.min(e.clientX + 14, innerWidth - 220) + "px"; tip.style.top = (e.clientY + 14) + "px"; };
  const hideTip = () => tip.style.opacity = 0;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();


  const figs = {
    // B: Phase F, 6 models; harm = 1 - fleet output / no-rogue output.
    B(svg, root) {
      const arms = ["No defence", "Verified record", "Exclusion vote", "Record + exclusion", "Damage cap", "Warning", "Placebo", "Identity binding"];
      const data = { selfish: [0.112, 0.172, 0.026, 0.025, -0.006, 0.125, 0.118, 0.139], liar: [0.169, 0.180, 0.104, 0.105, 0.040, 0.174, 0.152, 0.165], framer: [0.128, 0.155, 0.090, 0.131, 0.007, 0.135, 0.131, 0.139], shifter: [0.153, 0.187, 0.100, 0.118, 0.087, 0.176, 0.150, 0.167] };
      data.all = arms.map((_, i) => ["selfish", "liar", "framer", "shifter"].reduce((s, k) => s + data[k][i], 0) / 4);
      const L = 128, R = 460, T = 6, rowH = 30, max = 0.2, x = v => L + Math.max(v, 0) / max * (R - L);
      const draw = key => {
        svg.textContent = "";
        [0, 0.05, 0.1, 0.15, 0.2].forEach(v => { el("line", { class: "gl", x1: x(v), x2: x(v), y1: T, y2: T + rowH * 8 }, svg); el("text", { x: x(v), y: T + rowH * 8 + 16, "text-anchor": "middle" }, svg, Math.round(v * 100) + "%"); });
        el("text", { x: (L + R) / 2, y: T + rowH * 8 + 34, "text-anchor": "middle" }, svg, "Fleet output lost to the rogue");
        data[key].forEach((v, i) => {
          const yy = T + i * rowH, hot = i === 4, w = Math.max(x(v) - L, 2);
          el("text", { x: L - 10, y: yy + 19, "text-anchor": "end", class: hot ? "lbl" : "" }, svg, arms[i]);
          el("rect", { x: L, y: yy + 7, width: w, height: 16, rx: 4, fill: hot ? css("--roof") : css("--bar-base") }, svg);
          el("text", { x: L + w + 6, y: yy + 19, class: hot ? "lbl" : "" }, svg, v < 0.005 ? "≈0" : Math.round(v * 100) + "%");
          const h = el("rect", { x: 0, y: yy, width: 520, height: rowH, fill: "transparent" }, svg); h.addEventListener("pointermove", e => showTip(e, `${arms[i]}: ${(v * 100).toFixed(1)}% of output lost`)); h.addEventListener("pointerleave", hideTip);
        });
      };
      const btns = [...root.querySelectorAll("[data-rogue]")];
      btns.forEach(b => b.addEventListener("click", () => { btns.forEach(o => o.setAttribute("aria-pressed", o === b)); draw(b.dataset.rogue); }));
      draw("all");
    }
  };
  document.querySelectorAll("[data-fig]").forEach(n => { const f = figs[n.dataset.fig]; if (f) f(n, n.closest(".civ-fig")); });
})();
