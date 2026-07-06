'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Barakah Field — a physically-lit 3D moon behind the app canvas.
 * A displaced sphere is lit from one grazing side, so the crescent is
 * REAL lighting (exactly how the hilal forms in the sky), not a shape.
 * A sparse starfield drifts behind it. One mesh + one Points draw call,
 * DPR-capped, paused when the tab is hidden, disposed on unmount, and
 * skipped entirely under prefers-reduced-motion.
 */

/** Deterministic pseudo-noise — layered trig, no Math.random at render. */
function surfaceNoise(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 4.1 + y * 2.3) * 0.45 +
    Math.sin(y * 5.7 + z * 3.1) * 0.3 +
    Math.sin(z * 6.3 + x * 4.7) * 0.25
  );
}

function buildMoon(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(5, 128, 128);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  // Crater-ish displacement: small, so the terminator line looks organic.
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = surfaceNoise(v.x, v.y, v.z) * 0.045;
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8f8a80,
    roughness: 0.95,
    metalness: 0,
  });
  return new THREE.Mesh(geo, mat);
}

function buildStars(): THREE.Points {
  const positions: number[] = [];
  const colors: number[] = [];
  const gold = new THREE.Color('#e8c563');
  const white = new THREE.Color('#cfd4de');
  const c = new THREE.Color();
  for (let i = 0; i < 420; i++) {
    const r = 22 + Math.random() * 26;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      -Math.abs(r * Math.cos(phi)) - 6,
    );
    c.lerpColors(white, gold, Math.random() * 0.6);
    colors.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export default function BarakahField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const moon = buildMoon();
    const stars = buildStars();
    // Upper-right, out of the content's way.
    group.position.set(9.5, 5.5, 0);
    group.add(moon);
    scene.add(group, stars);

    // The crescent IS this light: warm sun grazing from the far right.
    const sun = new THREE.DirectionalLight(0xffe9c4, 3.2);
    sun.position.set(14, 2, -9);
    scene.add(sun);
    // Earthshine — the faint blue-grey glow on the dark side.
    scene.add(new THREE.AmbientLight(0x1a2438, 2.2));
    const rim = new THREE.PointLight(0xc89b3c, 8, 40);
    rim.position.set(16, 8, 4);
    scene.add(rim);

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
      // Slow libration — the moon breathes and turns, never flips.
      moon.rotation.y = t * 0.02;
      moon.rotation.x = Math.sin(t * 0.05) * 0.04;
      stars.rotation.z = t * 0.004;
      // Pointer parallax on the whole scene group.
      group.position.x += (9.5 + pointer.x * 0.9 - group.position.x) * 0.03;
      group.position.y += (5.5 - pointer.y * 0.7 - group.position.y) * 0.03;
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
      moon.geometry.dispose();
      (moon.material as THREE.Material).dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.55 }}
    />
  );
}
