/* ============================================================
   TERRA / KINESIS — WebGL stage
   - Realistic Earth (Three.js) with day texture + subtle bumps
   - Fresnel atmosphere aura (blue/green idle → orange active)
   - Deep starfield + periodic shooting stars
   - Exposes window.__stage.setPalette('aurora' | 'magma' | 'glacier')
     and window.__stage.setIntensity(0..1) for prompt-driven heat.
   ============================================================ */

import * as THREE from 'three';

/* ---------- Palettes ---------- */
const PALETTES = {
  aurora: {
    inner: new THREE.Color('#4de3c1'),
    outer: new THREE.Color('#2a8bff'),
    rim:   new THREE.Color('#7ff2d7'),
  },
  magma: {
    inner: new THREE.Color('#ffb46b'),
    outer: new THREE.Color('#ea4b1a'),
    rim:   new THREE.Color('#ffd7a8'),
  },
  glacier: {
    inner: new THREE.Color('#a3d8ff'),
    outer: new THREE.Color('#2a8bff'),
    rim:   new THREE.Color('#dbeeff'),
  },
};

const canvas = document.getElementById('scene');
const parent = canvas.parentElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 4.4);

/* ---------- Lighting: two soft rims + fill ---------- */
const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(-3, 2, 3);
scene.add(key);

const rim = new THREE.DirectionalLight(0x5aa3ff, 0.7);
rim.position.set(3, -1, -2);
scene.add(rim);

scene.add(new THREE.AmbientLight(0x1a2030, 0.35));

/* ---------- Earth ---------- */
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

// Reliable Earth textures (three.js examples CDN)
const EARTH_MAP   = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_BUMP  = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC  = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';

const earthGeom = new THREE.SphereGeometry(0.8, 64, 64);
const earthMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.85,
  metalness: 0.0,
});

// Async texture wiring so first paint is instant
loader.load(EARTH_MAP, (t) => { t.colorSpace = THREE.SRGBColorSpace; earthMat.map = t; earthMat.needsUpdate = true; });
loader.load(EARTH_BUMP, (t) => { earthMat.normalMap = t; earthMat.normalScale = new THREE.Vector2(0.6, 0.6); earthMat.needsUpdate = true; });
loader.load(EARTH_SPEC, (t) => { earthMat.roughnessMap = t; earthMat.needsUpdate = true; });

const earth = new THREE.Mesh(earthGeom, earthMat);
earth.rotation.z = 0.35; // subtle tilt
scene.add(earth);

/* ---------- Atmosphere aura (Fresnel shader) ---------- */
const auraUniforms = {
  uInner:     { value: PALETTES.aurora.inner.clone() },
  uOuter:     { value: PALETTES.aurora.outer.clone() },
  uRim:       { value: PALETTES.aurora.rim.clone() },
  uIntensity: { value: 1.0 },
  uPower:     { value: 3.0 },
  uTime:      { value: 0.0 },
};

const auraMat = new THREE.ShaderMaterial({
  uniforms: auraUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  vertexShader: `
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    uniform vec3 uInner;
    uniform vec3 uOuter;
    uniform vec3 uRim;
    uniform float uIntensity;
    uniform float uPower;
    uniform float uTime;
    void main() {
      float f = 1.0 - max(dot(vNormalW, vViewDir), 0.0);
      float rim = pow(f, uPower);
      // Layered halo: inner core → outer bleed → hot rim
      vec3 col = mix(uInner, uOuter, smoothstep(0.0, 0.9, rim));
      col = mix(col, uRim, smoothstep(0.75, 1.0, rim));
      // gentle breathing
      float breathe = 0.9 + 0.1 * sin(uTime * 0.6);
      float a = rim * uIntensity * breathe;
      gl_FragColor = vec4(col, a);
    }
  `,
});

const aura = new THREE.Mesh(new THREE.SphereGeometry(1.1, 78, 70), auraMat);
scene.add(aura);

// Outer soft halo (bigger, dimmer)
const halo = new THREE.Mesh(
  new THREE.SphereGeometry(1.45, 64, 64),
  new THREE.ShaderMaterial({
    uniforms: auraUniforms,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: auraMat.vertexShader,
    fragmentShader: `
      varying vec3 vNormalW; varying vec3 vViewDir;
      uniform vec3 uOuter; uniform vec3 uRim;
      uniform float uIntensity; uniform float uTime;
      void main() {
        float f = 1.0 - max(dot(vNormalW, vViewDir), 0.0);
        float rim = pow(f, 5.0);
        vec3 col = mix(uOuter, uRim, smoothstep(0.6, 1.0, rim));
        float breathe = 0.85 + 0.15 * sin(uTime * 0.4 + 1.2);
        gl_FragColor = vec4(col, rim * 0.55 * uIntensity * breathe);
      }
    `,
  })
);
scene.add(halo);

/* ---------- Starfield (static, dense) ---------- */
function makeStars(count, spread, size) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // random point in a shell
    const r = spread * (0.6 + Math.random() * 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // slight color variance (white → pale blue)
    const t = Math.random();
    colors[i * 3]     = 0.85 + 0.15 * (1 - t);
    colors[i * 3 + 1] = 0.9 + 0.1 * (1 - t);
    colors[i * 3 + 2] = 1.0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.9, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
const starsNear = makeStars(900, 18, 0.035);
const starsFar  = makeStars(1600, 40, 0.06);
scene.add(starsNear, starsFar);

/* ---------- Shooting stars ---------- */
class Shooting {
  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.mat = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending,
    });
    this.line = new THREE.Line(this.geo, this.mat);
    this.reset(true);
    scene.add(this.line);
  }
  reset(deadStart = false) {
    // Random plane behind & around globe
    const side = Math.random() < 0.5 ? -1 : 1;
    const y0 = (Math.random() - 0.2) * 8;
    const x0 = side * (5 + Math.random() * 6);
    const z0 = -6 - Math.random() * 8;
    this.start = new THREE.Vector3(x0, y0, z0);
    // travel direction: mostly diagonal
    const dir = new THREE.Vector3(-side * (0.6 + Math.random() * 0.6), -0.4 - Math.random() * 0.5, 0.2);
    dir.normalize();
    this.dir = dir;
    this.speed = 10 + Math.random() * 14;
    this.length = 0.6 + Math.random() * 1.2;
    this.life = 0;
    this.maxLife = 0.7 + Math.random() * 0.7;
    this.delay = deadStart ? Math.random() * 4 : Math.random() * 3 + 0.4;
    this.mat.opacity = 0;
  }
  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.life += dt;
    const p = this.start.clone().add(this.dir.clone().multiplyScalar(this.speed * this.life));
    const tail = p.clone().sub(this.dir.clone().multiplyScalar(this.length));
    const arr = this.geo.attributes.position.array;
    arr[0] = tail.x; arr[1] = tail.y; arr[2] = tail.z;
    arr[3] = p.x;    arr[4] = p.y;    arr[5] = p.z;
    this.geo.attributes.position.needsUpdate = true;
    // ease in/out opacity
    const t = this.life / this.maxLife;
    this.mat.opacity = t < 0.15 ? t / 0.15 : (1 - Math.min(1, (t - 0.15) / 0.85)) * 0.9;
    if (this.life >= this.maxLife) this.reset();
  }
}
const shootingStars = new Array(6).fill(0).map(() => new Shooting());

/* ---------- Interaction: parallax by mouse ---------- */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5);
  mouse.ty = (e.clientY / window.innerHeight - 0.5);
}, { passive: true });

/* ---------- Resize (throttled) ---------- */
function resize() {
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Slightly zoom out on small screens
  camera.position.z = w < 500 ? 3.4 : 3.4;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

/* ---------- Public API for main.js ---------- */
let currentPalette = 'aurora';
let targetIntensity = 1.0;

function lerpColor(a, b, t) { return a.clone().lerp(b, t); }

const api = {
  setPalette(name) {
    if (!PALETTES[name]) return;
    currentPalette = name;
  },
  setIntensity(v) {
    targetIntensity = Math.max(0.4, Math.min(1.8, v));
  },
  burst() {
    // spawn 3 quick shooting stars for a submit event
    for (let i = 0; i < 3; i++) {
      const s = new Shooting();
      s.delay = i * 0.08;
      s.maxLife = 0.9;
      shootingStars.push(s);
    }
    // cap total
    while (shootingStars.length > 14) {
      const dead = shootingStars.shift();
      scene.remove(dead.line);
    }
  },
};
window.__stage = api;

/* ---------- Animation loop ---------- */
const clock = new THREE.Clock();
let raf = null;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  // rotation
  earth.rotation.y += dt * 0.08;
  aura.rotation.y  = earth.rotation.y * 0.9;
  halo.rotation.y  = earth.rotation.y * 0.6;
  starsNear.rotation.y += dt * 0.005;
  starsFar.rotation.y  += dt * 0.002;

  // parallax easing
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  scene.rotation.y = mouse.x * 0.25;
  scene.rotation.x = mouse.y * -0.15;

  // palette interpolation
  const p = PALETTES[currentPalette];
  auraUniforms.uInner.value.lerp(p.inner, 0.06);
  auraUniforms.uOuter.value.lerp(p.outer, 0.06);
  auraUniforms.uRim.value.lerp(p.rim,   0.06);
  auraUniforms.uIntensity.value += (targetIntensity - auraUniforms.uIntensity.value) * 0.05;
  auraUniforms.uTime.value = t;

  // shooting stars
  for (const s of shootingStars) s.update(dt);

  renderer.render(scene, camera);
  raf = requestAnimationFrame(tick);
}
tick();

// Pause when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
  else if (!raf) { clock.start(); tick(); }
});
