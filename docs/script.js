// You can add any custom functionality here if required
console.log("Welcome to Aditya Chatterjee's Project Showcase!");

document.addEventListener("DOMContentLoaded", () => {
    // Reveal-on-scroll effect
    const revealTargets = document.querySelectorAll(".project, .internship");
    revealTargets.forEach(el => el.classList.add("reveal"));
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealTargets.forEach(el => observer.observe(el));

    // Cursor-follow glow for cards and internships
    const glowTargets = document.querySelectorAll('.project, .internship');
    glowTargets.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            el.style.setProperty('--mx', `${x}%`);
            el.style.setProperty('--my', `${y}%`);
        });
    });

    // Parallax tilt on header title
    const header = document.querySelector('header');
    const title = document.querySelector('.header-text h1');
    if (header && title) {
        header.addEventListener('mousemove', (e) => {
            const rect = header.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            const deltaX = (e.clientX - midX) / rect.width;
            const deltaY = (e.clientY - midY) / rect.height;
            title.style.setProperty('--ry', `${deltaX * 8}deg`);
            title.style.setProperty('--rx', `${-deltaY * 8}deg`);
        });
        header.addEventListener('mouseleave', () => {
            title.style.setProperty('--ry', `0deg`);
            title.style.setProperty('--rx', `0deg`);
        });
    }

    // Lightning effect in header (automatic, non-darkening)
    const lightningCanvas = document.getElementById('lightning');
    if (lightningCanvas) {
        const ctx = lightningCanvas.getContext('2d');
        const DPR = window.devicePixelRatio || 1;
        function resize() {
            lightningCanvas.width = lightningCanvas.clientWidth * DPR;
            lightningCanvas.height = lightningCanvas.clientHeight * DPR;
        }
        resize();
        window.addEventListener('resize', resize);
        function bolt() {
            const w = lightningCanvas.width;
            const h = lightningCanvas.height;
            const sx = Math.random() * w;
            const sy = 0;
            let x = sx;
            let y = sy;
            // draw glow path
            ctx.lineWidth = 2 * DPR;
            ctx.strokeStyle = 'rgba(160, 190, 255, 0.95)';
            ctx.shadowColor = 'rgba(96,165,250,1)';
            ctx.shadowBlur = 28 * DPR;
            ctx.beginPath();
            ctx.moveTo(x, y);
            const steps = 18 + Math.floor(Math.random() * 10);
            for (let i = 0; i < steps; i++) {
                x += (Math.random() - 0.5) * 60 * DPR;
                y += (h / steps) * (0.8 + Math.random() * 0.4);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            // gentle, additive fade that does not darken image
            const fadeStart = performance.now();
            function fade(now) {
                const t = (now - fadeStart) / 300; // ~300ms
                if (t < 1) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fillStyle = `rgba(0,0,0,${0.08})`;
                    ctx.fillRect(0,0,w,h);
                    ctx.globalCompositeOperation = 'lighter';
                    requestAnimationFrame(fade);
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
            requestAnimationFrame(fade);
        }
        setInterval(bolt, 1800 + Math.random()*1000);
        // occasional double-bolt
        setInterval(() => { if (Math.random() < 0.4) bolt(); }, 3200);
    }

    // Interlude removed
});

function toggleContent(id) {
    const content = document.getElementById(id);
    if (content.classList.contains("open")) {
        content.classList.remove("open");
    } else {
        content.classList.add("open");
    }
}