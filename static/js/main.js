/* ============================================================
   TERRA / KINESIS — UI motion & prompt handling (vanilla)
   - Lenis smooth momentum scroll
   - GSAP scroll reveals + on-load masked line reveals
   - Custom cursor
   - Prompt: typing cadence → globe aura hue (aurora → magma)
   - File upload preview list
   ============================================================ */

const stage = () => window.__stage; // set by globe.js

/* ---------- Lenis smooth scroll ---------- */
const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: true,
  smoothTouch: false,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

// GSAP + ScrollTrigger bridge
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Custom cursor ---------- */
const cursor = document.querySelector('.cursor');
const dot = cursor?.querySelector('.cursor-dot');
const ring = cursor?.querySelector('.cursor-ring');
let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0;
window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
function cursorLoop() {
  dx += (mx - dx) * 0.55;
  dy += (my - dy) * 0.55;
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  if (dot) dot.style.transform = `translate(${dx}px, ${dy}px)`;
  if (ring) ring.style.transform = `translate(${rx}px, ${ry}px)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();
document.querySelectorAll('[data-hover]').forEach((el) => {
  el.addEventListener('mouseenter', () => document.body.classList.add('is-hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering'));
});

/* ---------- Hero masked line reveal (on load) ---------- */
window.addEventListener('load', () => {
  if (!window.gsap) return;
  const lines = document.querySelectorAll('.hero__title .line__inner');
  gsap.to(lines, {
    yPercent: 0,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.11,
    delay: 0.15,
  });

  gsap.from('.tag', { opacity: 0, y: 12, duration: 0.9, ease: 'expo.out', delay: 0.35 });
  gsap.from('.hero__lede', { opacity: 0, y: 18, duration: 1.0, ease: 'expo.out', delay: 0.6 });
  gsap.from('.cta', { opacity: 0, y: 18, duration: 1.0, ease: 'expo.out', delay: 0.72 });
  gsap.from('.hero__ticker span', { opacity: 0, y: 10, duration: 0.9, ease: 'expo.out', stagger: 0.04, delay: 0.85 });
  gsap.from('.nav', { opacity: 0, y: -12, duration: 0.9, ease: 'expo.out', delay: 0.9 });
  gsap.from('.scroll-hint', { opacity: 0, duration: 1.2, ease: 'expo.out', delay: 1.2 });
});

/* ---------- Scroll reveals ---------- */
if (window.gsap && window.ScrollTrigger) {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.0, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      onStart: () => el.classList.add('is-in'),
    });
  });

  // Tenets: staggered
  gsap.utils.toArray('.tenet').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.0, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onStart: () => el.classList.add('is-in'),
    });
  });

  // Subtle parallax on plates
  gsap.utils.toArray('.plate__frame img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Section titles subtle rise
  gsap.utils.toArray('.section-title, .chapter').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 24, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

/* ---------- Live clock in hero ticker ---------- */
const clockEl = document.getElementById('hero-clock');
function tickClock() {
  if (!clockEl) return;
  const d = new Date();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}:${ss} UTC`;
}
tickClock();
setInterval(tickClock, 1000);

/* ---------- Prompt: cadence → aura ---------- */
const input = document.getElementById('prompt-input');
const count = document.querySelector('[data-testid="prompt-count"]');
const statusLabel = document.querySelector('[data-testid="status-label"]');
const form = document.getElementById('prompt');

let idleTimer = null;
let typingSince = 0;
let charsBurst = 0;
let lastKey = 0;

function setPaletteState(state, palette, label) {
  document.body.dataset.state = state;
  stage()?.setPalette(palette);
  if (statusLabel) statusLabel.textContent = label;
}

input?.addEventListener('input', () => {
  const v = input.value;
  if (count) count.textContent = `${v.length} / 1200`;

  const now = performance.now();
  if (now - lastKey < 1200) charsBurst += 1; else charsBurst = 1;
  lastKey = now;
  if (!typingSince) typingSince = now;

  // heat: more sustained typing → hotter aura
  const heat = Math.min(1.6, 0.9 + charsBurst * 0.03);
  stage()?.setIntensity(heat);

  if (v.trim().length > 0) {
    setPaletteState('typing', 'magma', 'Composing — magma');
  }

  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    typingSince = 0; charsBurst = 0;
    stage()?.setIntensity(1.0);
    if (!input.value.trim()) setPaletteState('idle', 'aurora', 'Listening — idle');
    else setPaletteState('typing', 'magma', 'Held — magma');
  }, 1300);
});

/* Preset chips */
document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.preset;
    const map = {
      aurora:  ['idle',   'aurora',  'Listening — idle'],
      magma:   ['typing', 'magma',   'Composing — magma'],
      glacier: ['idle',   'glacier', 'Standby — glacier'],
    };
    const s = map[name] || map.aurora;
    setPaletteState(s[0], s[1], s[2]);
    stage()?.setIntensity(name === 'magma' ? 1.4 : 1.0);
  });
});

/* Submit: burst + brief flash — no backend call (wire your Flask route here) */
form?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const question = input?.value.trim();

    if (!question) {
        alert("Please enter a question.");
        return;
    }

    stage()?.burst();

    try {

        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question
            })
        });

        const result = await response.json();

        console.log("ASK RESPONSE:", result);

        // Backend returned an error
        if (!response.ok || result.success === false) {

            alert(
                result.error ||
                "Something went wrong while processing your question."
            );

            return;
        }

        // Successful answer
        if (result.answer) {

            alert(result.answer);

        } else {

            alert("The server returned no answer.");

            console.log("Unexpected response:", result);
        }

    } catch (err) {

        console.error("ASK ERROR:", err);

        alert(
            "Could not connect to the server. Check the Docker terminal."
        );
    }

});

/* ---------- File upload preview ---------- */
const fileInput = document.getElementById('prompt-file');
const fileList = document.getElementById('file-list');

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function iconFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return '◭';
  if (['pdf'].includes(ext)) return '◫';
  if (['txt','md','csv','json'].includes(ext)) return '≡';
  return '◇';
}

const bucket = [];
function renderFiles() {
  if (!fileList) return;
  fileList.innerHTML = '';
  bucket.forEach((file, i) => {
    const li = document.createElement('li');
    li.dataset.testid = `file-item-${i}`;
    li.innerHTML = `
      <span class="fico">${iconFor(file.name)}</span>
      <span class="fname" title="${file.name}">${file.name}</span>
      <span class="fsize">${fmtSize(file.size)}</span>
      <button type="button" data-remove="${i}" data-testid="file-remove-${i}" aria-label="Remove file">Remove</button>
    `;
    fileList.appendChild(li);
  });
}
fileInput?.addEventListener("change", async () => {

    const files = Array.from(fileInput.files || []);

    for (const file of files) {

        bucket.push(file);

        const formData = new FormData();
        formData.append("pdf", file);

        try {

            const response = await fetch("/upload", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            console.log(result);

            if (result.success) {
                alert("✅ PDF Indexed Successfully");
            } else {
                alert(result.error || "Upload Failed");
            }

        } catch (err) {

            console.error(err);
            alert("Server Error");

        }

    }

    renderFiles();

    fileInput.value = "";

});




fileList?.addEventListener('click', (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && t.dataset.remove !== undefined) {
    bucket.splice(Number(t.dataset.remove), 1);
    renderFiles();
  }
});
