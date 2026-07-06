'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Barakah Field — a live WebGL layer behind the entire app canvas:
 * thousands of gold particles arranged as a rotating eight-point star
 * (two nested rings of it), breathing slowly and parallaxing with the
 * pointer. One THREE.Points draw call, DPR-capped, paused when the tab
 * is hidden, fully disposed on unmount, absent under reduced motion.
 */

const GOLD_A = new THREE.Color('#c89b3c');
const GOLD_B = new THREE.Color('#e8c563');
const EMERALD = new THREE.Color('#2d8a5f');

/**
 * Points filling a crescent (hilal): the region inside the outer circle
 * but outside a slightly smaller circle offset toward one side. Rejection
 * sampling keeps the shape crisp; jitter adds depth.
 */
function crescent(count: number, radius: number, z: number, jitter: number): number[] {
  const pts: number[] = [];
  const innerR = radius * 0.82;
  const offset = radius * 0.38;
  while (pts.length < count * 3) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    // Inside the offset inner circle → the "bite" — reject.
    const dx = x - offset;
    if (dx * dx + y * y < innerR * innerR) continue;
    pts.push(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      z + (Math.random() - 0.5) * jitter * 2,
    );
  }
  return pts;
}

function buildGeometry(): THREE.BufferGeometry {
  const positions: number[] = [
    ...crescent(3200, 11, 0, 0.5),
    ...crescent(1200, 6, -2.5, 0.4),
  ];
  // Loose ambient dust sphere around the stars.
  for (let i = 0; i < 700; i++) {
    const r = 14 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi) * 0.35 - 4,
    );
  }

  const n = positions.length / 3;
  const colors = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    // Mostly gold with an occasional emerald spark.
    if (t > 0.94) c.copy(EMERALD);
    else c.lerpColors(GOLD_A, GOLD_B, Math.random());
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export default function BarakahField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 26;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const geometry = buildGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

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
      const t = clock.getElapsedTime();
      // Gentle sway, not a full spin — a crescent shouldn't invert.
      points.rotation.z = Math.sin(t * 0.07) * 0.16;
      const breathe = 1 + Math.sin(t * 0.32) * 0.025;
      points.scale.setScalar(breathe);
      // Pointer parallax — eased toward the cursor.
      points.rotation.x += (pointer.y * 0.14 - points.rotation.x) * 0.03;
      points.rotation.y += (pointer.x * 0.14 - points.rotation.y) * 0.03;
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
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.85 }}
    />
  );
}
