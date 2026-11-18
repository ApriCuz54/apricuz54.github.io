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
