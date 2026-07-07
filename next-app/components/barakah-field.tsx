'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Barakah Field — an immersive space scene behind the app:
 *  - three parallax star layers that drift TOWARD the camera and wrap,
 *    so the page feels like it is gliding through space
 *  - a crescent made of pure light (canvas radial gradients — light can
 *    never read as a rock the way lit geometry did)
 *  - deep indigo nebula wisps for spatial richness
 *  - the sacred words (بركة، صدقة، رحمة، خير، إحسان) floating at real
 *    depths among the stars
 * All textures are generated at runtime (no assets), everything is
 * disposed on unmount, paused when hidden, skipped on reduced motion.
 */

const WORDS = ['بركة', 'صدقة', 'رحمة', 'خير', 'إحسان'];

/**
 * Night flies through a star field; day glides through warm bronze dust
 * over paper. Same sky, two times of day — the scene re-composes itself
 * whenever the user flips the theme (no reload needed).
 * Additive blending only works against dark; day uses normal blending
 * with ink-gold pigments, or everything would white-out.
 */
const PALETTES = {
  dark: {
    hostOpacity: 0.8,
    blending: THREE.AdditiveBlending,
    star: { color: 0xd8dce8, opacity: 0.85 },
    nebulaA: [[0, 'rgba(38,52,96,0.5)'], [0.6, 'rgba(24,34,66,0.22)'], [1, 'rgba(0,0,0,0)']] as [number, string][],
    nebulaB: [[0, 'rgba(45,138,95,0.22)'], [1, 'rgba(0,0,0,0)']] as [number, string][],
    disc: [[0, 'rgba(255,240,205,0.95)'], [0.55, 'rgba(232,197,99,0.55)'], [1, 'rgba(200,155,60,0)']] as [number, string][],
    halo: [[0, 'rgba(232,197,99,0.4)'], [0.4, 'rgba(200,155,60,0.14)'], [1, 'rgba(0,0,0,0)']] as [number, string][],
    wordFill: 'rgba(232,197,99,0.9)',
    wordShadow: 'rgba(232,197,99,0.85)',
    wordMin: 0.05,
    wordRange: 0.16,
  },
  light: {
    hostOpacity: 0.55,
    blending: THREE.NormalBlending,
    star: { color: 0x8a6d2f, opacity: 0.5 },
    nebulaA: [[0, 'rgba(156,122,46,0.14)'], [0.6, 'rgba(156,122,46,0.06)'], [1, 'rgba(156,122,46,0)']] as [number, string][],
    nebulaB: [[0, 'rgba(45,138,95,0.10)'], [1, 'rgba(45,138,95,0)']] as [number, string][],
    disc: [[0, 'rgba(150,108,30,0.92)'], [0.55, 'rgba(156,122,46,0.5)'], [1, 'rgba(156,122,46,0)']] as [number, string][],
    halo: [[0, 'rgba(156,122,46,0.26)'], [0.4, 'rgba(156,122,46,0.10)'], [1, 'rgba(156,122,46,0)']] as [number, string][],
    wordFill: 'rgba(92,70,24,1)',
    wordShadow: 'rgba(122,95,35,0.35)',
    wordMin: 0.16,
    wordRange: 0.38,
  },
} as const;

type Mode = keyof typeof PALETTES;

function radialSprite(size: number, stops: [number, string][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Crescent of light: a glowing disc with a soft offset bite erased out. */
function crescentTexture(disc: readonly (readonly [number, string])[]): THREE.CanvasTexture {
  const s = 512;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const cx = s / 2;

  const g = ctx.createRadialGradient(cx, cx, s * 0.18, cx, cx, s * 0.42);
  for (const [at, color] of disc) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, s * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Soft-edged bite, offset toward the upper-left → waxing hilal.
  ctx.globalCompositeOperation = 'destination-out';
  const bite = ctx.createRadialGradient(cx - s * 0.13, cx - s * 0.08, s * 0.05, cx - s * 0.13, cx - s * 0.08, s * 0.38);
  bite.addColorStop(0, 'rgba(0,0,0,1)');
  bite.addColorStop(0.82, 'rgba(0,0,0,1)');
  bite.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bite;
  ctx.beginPath();
  ctx.arc(cx - s * 0.13, cx - s * 0.08, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return new THREE.CanvasTexture(canvas);
}

function wordTexture(word: string, fill: string, shadow: string): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '110px Amiri, "Noto Nastaliq Urdu", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = fill;
  ctx.fillText(word, w / 2, h / 2);
  return new THREE.CanvasTexture(canvas);
}

function sprite(tex: THREE.CanvasTexture, opacity: number, blending: THREE.Blending): THREE.Sprite {
  return new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending, depthWrite: false }),
  );
}

interface StarLayer {
  points: THREE.Points;
  speed: number;
}

function buildStarLayer(count: number, size: number, speed: number, spread: number, star: { color: number; opacity: number }): StarLayer {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
    positions[i * 3 + 2] = -Math.random() * 90;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size,
    color: star.color,
    transparent: true,
    opacity: star.opacity,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return { points: new THREE.Points(geo, mat), speed };
}

export default function BarakahField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );

  // Recompose the sky live when the user flips dark/light in settings.
  useEffect(() => {
    const mo = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const P = PALETTES[mode];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    // ── Star layers: far/mid/near for parallax, drifting toward camera ──
    const layers: StarLayer[] = [
      buildStarLayer(320, 0.06, 0.9, 70, P.star),
      buildStarLayer(220, 0.1, 1.7, 55, P.star),
      buildStarLayer(110, 0.16, 3.0, 45, P.star),
    ];
    for (const l of layers) scene.add(l.points);

    // ── Nebula wisps: deep indigo + one faint emerald breath ──
    const nebulaA = sprite(radialSprite(256, [...P.nebulaA]), 0.5, P.blending);
    nebulaA.scale.set(70, 42, 1);
    nebulaA.position.set(-16, -6, -60);
    const nebulaB = sprite(radialSprite(256, [...P.nebulaB]), 0.4, P.blending);
    nebulaB.scale.set(46, 30, 1);
    nebulaB.position.set(20, 10, -70);
    scene.add(nebulaA, nebulaB);

    // ── The hilal: pure light, upper right ──
    const moon = sprite(crescentTexture(P.disc), 0.95, P.blending);
    moon.scale.setScalar(11);
    moon.position.set(10.5, 6, -14);
    const halo = sprite(radialSprite(256, [...P.halo]), 0.8, P.blending);
    halo.scale.setScalar(20);
    halo.position.copy(moon.position).z -= 1;
    scene.add(halo, moon);

    // ── Sacred words floating at depth among the stars ──
    const words = WORDS.map((w, i) => {
      const sp = sprite(wordTexture(w, P.wordFill, P.wordShadow), P.wordMin + P.wordRange, P.blending);
      const depth = -18 - i * 12;
      sp.position.set(((i % 2 === 0 ? -1 : 1) * (6 + (i * 3.7) % 12)), ((i * 5.3) % 14) - 7, depth);
      sp.scale.set(10, 5, 1);
      scene.add(sp);
      return sp;
    });

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let hidden = document.hidden;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // Glide through space: stars stream past and wrap behind.
      for (const l of layers) {
        const pos = l.points.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let z = pos.getZ(i) + l.speed * dt;
          if (z > camera.position.z + 2) z = -90;
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
      }

      // Words drift forward far more slowly — arriving, not rushing.
      for (const wSp of words) {
        wSp.position.z += dt * 0.5;
        if (wSp.position.z > 2) wSp.position.z = -75;
        const fade = 1 - Math.min(1, Math.abs(wSp.position.z + 30) / 45);
        wSp.material.opacity = P.wordMin + fade * P.wordRange;
      }

      // Hilal breathes; halo shimmers gently.
      moon.material.rotation = Math.sin(t * 0.08) * 0.06;
      halo.material.opacity = 0.65 + Math.sin(t * 0.6) * 0.15;

      // Pointer parallax — the whole sky leans with the cursor.
      camera.rotation.y += (-pointer.x * 0.045 - camera.rotation.y) * 0.04;
      camera.rotation.x += (pointer.y * 0.03 - camera.rotation.x) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden) clock.getDelta();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      for (const l of layers) {
        l.points.geometry.dispose();
        (l.points.material as THREE.Material).dispose();
      }
      for (const s of [nebulaA, nebulaB, moon, halo, ...words]) {
        s.material.map?.dispose();
        s.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="barakah-field-host"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: PALETTES[mode].hostOpacity, transition: 'opacity 0.3s ease' }}
    />
  );
}
