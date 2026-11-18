// Small, progressive enhancements. The page works without any of this.
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
        navLinks.forEach(a => a.removeAttribute("aria-current"));
        const link = byId.get(e.target.id);
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id], footer[id]").forEach(s => io.observe(s));
  }

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

  // Keyboard: the chart is focusable and arrow keys move the workload.
  svg.setAttribute("tabindex", "0");
  let kx = 156;
  svg.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    kx += e.key === "ArrowRight" ? 20 : -20;
    kx = Math.max(X0 + 8, Math.min(X1 - 4, kx));
    place(kx);
  });

  readout.textContent = messages.low;
  place(156);
});
