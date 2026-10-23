import * as THREE from "three";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setClearColor(0x100c08, 1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x100c08);
scene.fog = new THREE.FogExp2(0x100c08, 0.045);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
camera.position.set(0, 0.2, 6.2);

scene.add(new THREE.AmbientLight(0xf2e2c4, 0.55));
const key = new THREE.DirectionalLight(0xffe1a8, 6);
key.position.set(3, 4, 5);
scene.add(key);
const fill = new THREE.PointLight(0x7ddec8, 8, 12);
fill.position.set(-3, -1, 2);
scene.add(fill);

const coin = new THREE.Mesh(
  new THREE.CylinderGeometry(0.95, 0.95, 0.16, 48),
  new THREE.MeshStandardMaterial({ color: 0xe2b15a, metalness: 0.85, roughness: 0.22 }),
);
coin.rotation.x = Math.PI / 2.4;
scene.add(coin);
const face = new THREE.Mesh(
  new THREE.CircleGeometry(0.62, 40),
  new THREE.MeshStandardMaterial({ color: 0x8a5a22, metalness: 0.4, roughness: 0.45 }),
);
face.position.z = 0.09;
coin.add(face);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.15, 0.015, 12, 80),
  new THREE.MeshBasicMaterial({ color: 0x7ddec8 }),
);
ring.rotation.x = 1.15;
scene.add(ring);
const bead = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xf4f0e6 }),
);
scene.add(bead);

const dust = new THREE.BufferGeometry();
const spots = new Float32Array(180 * 3);
for (let i = 0; i < spots.length; i++) spots[i] = (Math.random() - 0.5) * 12;
dust.setAttribute("position", new THREE.BufferAttribute(spots, 3));
scene.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: 0xf2e2c4, size: 0.02, transparent: true, opacity: 0.7 })));

const pointer = { x: 0, y: 0 };
addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / innerWidth - 0.5;
  pointer.y = event.clientY / innerHeight - 0.5;
});

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime() * (reduced ? 0.15 : 1);
  coin.rotation.z = t * 0.35;
  ring.rotation.z = t * 0.2;
  bead.position.set(Math.cos(t) * 2.15, Math.sin(t * 0.8) * 0.35, Math.sin(t) * 2.15);
  camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
  camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

export function setMode(mode) {
  const colors = { pass: 0x7ddec8, ask: 0xe2b15a, stop: 0xff6d7e, wait: 0xf4f0e6 };
  fill.color.setHex(colors[mode] || 0x7ddec8);
}
