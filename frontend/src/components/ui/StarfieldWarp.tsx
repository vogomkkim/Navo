'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * StarfieldWarp — lightweight warp-speed starfield for React (no deps).
 * - Pure DOM + CSS transforms (GPU accelerated)
 * - Tailwind-friendly container classes
 * - Respects prefers-reduced-motion
 * - Safe for SSR (guards on window)
 *
 * Props
 * - count: number of stars (default 600)
 * - depth: virtual z-depth in px (default 1200)
 * - speed: forward speed per frame in px (default 10)
 * - perspective: CSS perspective in px (default 700)
 * - paused: pause animation (default false)
 * - className: extra classes for the container
 * - starColor: CSS color for stars (default #fff)
 * - glow: enable outer glow (default true)
 * - children: overlay UI content rendered on top of the stars
 */
export type StarfieldWarpProps = {
  count?: number;
  depth?: number;
  speed?: number;
  perspective?: number;
  paused?: boolean;
  className?: string;
  starColor?: string;
  glow?: boolean;
  /**
   * Star color gradient stops. If provided with colorByDepth=true,
   * stars will blend from stops[0] (far) -> stops[last] (near).
   */
  colorStops?: string[];
  /** Whether to color stars by depth using colorStops (default true) */
  colorByDepth?: boolean;
  /** Enable soft Milky Way band overlay */
  milkyWay?: boolean;
  /** Opacity of Milky Way band (0..1) */
  milkyWayOpacity?: number;
  /** Angle of the band in degrees */
  milkyWayAngle?: number;
  /** Band thickness (CSS length, e.g. '45vmin') */
  milkyWayWidth?: string;
  /** Drift animation duration in seconds */
  milkyWayDrift?: number;
  children?: React.ReactNode;
};

export default function StarfieldWarp({
  count = 300,
  depth = 1200,
  speed = 5,
  perspective = 700,
  paused = false,
  className = '',
  starColor = '#ffffff',
  glow = true,
  colorStops = ['#9ad8ff', '#ffffff', '#ffd59a'],
  colorByDepth = true,
  milkyWay = true,
  milkyWayOpacity = 0.35,
  milkyWayAngle = -20,
  milkyWayWidth = '45vmin',
  milkyWayDrift = 60,
  children,
}: StarfieldWarpProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  // Internal star pool
  type StarEl = HTMLDivElement & { _x: number; _y: number; _z: number };
  const starsRef = useRef<StarEl[]>([]);
  const dimsRef = useRef({ w: 0, h: 0 });

  // Measure container via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      dimsRef.current = { w: el.clientWidth, h: el.clientHeight };
    });
    ro.observe(el);
    // Prime dims immediately
    dimsRef.current = { w: el.clientWidth, h: el.clientHeight };
    return () => ro.disconnect();
  }, []);

  // Create stars once
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Clean any existing
    for (const s of starsRef.current) root.removeChild(s);
    starsRef.current = [];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div') as StarEl;
      d.className = 'star';
      // Base style — Tailwind-like outcome via inline styles (no custom plugin needed)
      Object.assign(d.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '2px',
        height: '2px',
        borderRadius: '9999px',
        background: starColor,
        opacity: '0.9',
        willChange: 'transform',
        pointerEvents: 'none',
        filter: glow ? 'drop-shadow(0 0 6px rgba(255,255,255,.85))' : 'none',
      });
      resetStar(d, true, depth);
      starsRef.current.push(d);
      frag.appendChild(d);
    }
    root.appendChild(frag);

    return () => {
      if (root) {
        for (const s of starsRef.current) {
          if (root.contains(s)) {
            root.removeChild(s);
          }
        }
      }
      starsRef.current = [];
    };
    // recreate when count/starColor/glow changes
  }, [count, starColor, glow, depth]);

  // Animation loop
  useEffect(() => {
    if (paused || reduceMotion) return; // honor pause & reduce motion
    let running = true;

    const loop = () => {
      if (!running) return;
      for (const s of starsRef.current) {
        s._z += speed; // advance toward camera
        if (s._z > 80) resetStar(s, false, depth);
        updateStar(s, depth);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [speed, depth, paused, reduceMotion]);

  // When reduced motion, render a subtle static star backdrop using CSS gradients (no JS anim)
  const staticBackdrop = useMemo(() => {
    if (!reduceMotion) return undefined;
    return {
      backgroundImage:
        'radial-gradient(#ffffff 1px, transparent 1.2px), radial-gradient(#ffffff 1px, transparent 1.2px)',
      backgroundPosition: '0 0, 25px 25px',
      backgroundSize: '50px 50px',
      opacity: 0.6,
      filter: glow ? 'drop-shadow(0 0 4px rgba(255,255,255,.6))' : 'none',
    } as React.CSSProperties;
  }, [reduceMotion, glow]);

  return (
    <div
      ref={containerRef}
      className={
        'relative w-full h-full overflow-hidden bg-black ' + (className || '')
      }
      style={{ perspective: `${perspective}px` }}
      aria-label="Starfield warp background"
    >
      {/* Static background for reduced motion users */}
      {reduceMotion && (
        <div className="absolute inset-0" style={staticBackdrop} />
      )}

      {/* Vignette mask for cinematic edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 85%)',
        }}
      />

      {/* Milky Way band (soft dust) */}
      {milkyWay && !reduceMotion && (
        <>
          <style>{`  @keyframes mwDrift { 0% { transform: translate(-50%,-50%) rotate(${
            milkyWayAngle - 5
          }deg); } 100% { transform: translate(-50%,-50%) rotate(${
            milkyWayAngle + 5
          }deg);} }  @keyframes auroraMove { 0% { background-position: 0% 0%, 0 0; } 100% { background-position: 100% 0%, 16px 20px; } }`}</style>
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '160vmax',
              height: milkyWayWidth,
              background:
                'linear-gradient(to bottom, rgba(0,170,255,0), rgba(0,200,255,0.45) 50%, rgba(0,170,255,0))',
              filter: 'blur(60px)',
              opacity: milkyWayOpacity,
              animation: `mwDrift ${milkyWayDrift}s ease-in-out infinite alternate`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(115deg, rgba(64,200,255,0.35) 20%, rgba(80,240,220,0.15) 50%, rgba(64,200,255,0.35) 80%), radial-gradient(rgba(255,255,255,0.35) 1px, transparent 3px)',
                backgroundPosition: '0% 0%, 0 0',
                backgroundSize: '200% 100%, 28px 28px',
                opacity: 0.5,
                filter: 'blur(1px)',
                animation: `auroraMove ${Math.max(
                  20,
                  milkyWayDrift * 0.8,
                )}s ease-in-out infinite alternate`,
              }}
            />
          </div>
        </>
      )}

      {/* Overlay UI */}
      {children && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );

  function resetStar(el: StarEl, randomizeZ: boolean, maxDepth: number) {
    const { w, h } = dimsRef.current;
    // Spread wider than viewport for nicer edges; center-origin coords
    const x = (Math.random() * 2 - 1) * (w * 0.9);
    const y = (Math.random() * 2 - 1) * (h * 0.9);
    const z = randomizeZ ? -Math.random() * maxDepth : -maxDepth;
    el._x = x;
    el._y = y;
    el._z = z;
    updateStar(el, maxDepth);
  }

  // Color gradient helpers
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t);
  }
  function sampleGradient(stops: string[], t: number) {
    if (!stops || stops.length === 0) return '#ffffff';
    if (stops.length === 1) return stops[0];
    const seg = 1 / (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(t / seg));
    const localT = (t - idx * seg) / seg;
    const [r1, g1, b1] = hexToRgb(stops[idx]);
    const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
    return `rgb(${mix(r1, r2, localT)}, ${mix(g1, g2, localT)}, ${mix(
      b1,
      b2,
      localT,
    )})`;
  }

  function updateStar(el: StarEl, maxDepth: number) {
    // Size grows as it comes closer
    const t = Math.min(1, 1 - -el._z / maxDepth); // 0..1
    const size = Math.max(1, 1 + t * 2.5); // 1..3.5px approx
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    // depth-based color
    const color =
      colorByDepth && colorStops && colorStops.length >= 2
        ? sampleGradient(colorStops, t)
        : starColor;
    el.style.background = color;
    el.style.transform = `translate3d(${el._x}px, ${el._y}px, ${el._z}px)`;
  }
}

// Hook: prefers-reduced-motion
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(!!m.matches);
    onChange();
    m.addEventListener?.('change', onChange);
    return () => m.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
