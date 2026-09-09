'use client';
import { useEffect, useRef } from 'react';
import {
  botPixels,
  motion,
  palette,
  type CompanionState,
} from '@/lib/jourvis/config';
import {
  webglRenderer,
  canvasRenderer,
  type ParticleRenderer,
} from '@/lib/jourvis/renderer';
type Anchor = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  el: HTMLElement;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  u: number;
  v: number;
  seed: number;
  kind: number;
  size: number;
};
const rgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];
const colors = {
  mint: rgb(palette.mint),
  emerald: rgb(palette.emerald),
  navy: rgb(palette.navy),
  gold: rgb(palette.gold),
  ivory: rgb(palette.ivory),
};
export default function ParticleWorld({
  state,
  paused,
}: {
  state: CompanionState;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ state, paused });
  useEffect(() => {
    current.current = { state, paused };
  }, [state, paused]);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const graphics = new URLSearchParams(window.location.search).get(
      'graphics',
    );
    if (graphics === 'off') {
      document.documentElement.dataset.graphics = 'static';
      return () => {
        delete document.documentElement.dataset.graphics;
      };
    }
    let canvas = document.createElement('canvas');
    let renderer: ParticleRenderer | null = null;
    let frame = 0,
      ended = false,
      width = window.innerWidth,
      height = window.innerHeight,
      scroll = window.scrollY,
      ratio = 1,
      last = 0,
      elapsed = 0,
      stillFrames = 0;
    let anchors: Anchor[] = [],
      zones: { x: number; y: number; width: number; height: number }[] = [],
      principle: { top: number; bottom: number } | null = null;
    let flow: { x: number; y: number; width: number; height: number } | null =
        null,
      lastState = current.current.state,
      stateTime = 0;
    const pointer = { x: -1000, y: -1000, active: false };
    let focus: HTMLElement | null = null,
      focusRect: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;
    const budget =
      width < 700 ? motion.mobileParticles : motion.desktopParticles;
    let seed = 5179;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const particles: Particle[] = Array.from({ length: budget }, () => ({
      x: random() * width,
      y: random() * height,
      vx: 0,
      vy: 0,
      u: random(),
      v: random(),
      seed: random() * 6.28,
      kind: 0,
      size: 1 + random() * 2,
    }));
    botPixels.forEach((row, y) =>
      row.split('').forEach((cell, x) => {
        if (cell === '0') return;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++)
            particles.push({
              x: width * 0.75 + (random() - 0.5) * 600,
              y: height * 0.45 + (random() - 0.5) * 600,
              vx: 0,
              vy: 0,
              u: x + dx * 0.5,
              v: y + dy * 0.5,
              seed: random() * 6.28,
              kind: +cell,
              size: 0.36,
            });
      }),
    );
    const data = new Float32Array(particles.length * 7);
    function measure() {
      width = window.innerWidth;
      height = window.innerHeight;
      scroll = window.scrollY;
      ratio = Math.min(window.devicePixelRatio || 1, motion.maxPixelRatio);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      anchors = [
        ...document.querySelectorAll<HTMLElement>('[data-particle-anchor]'),
      ].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          key: el.dataset.particleAnchor || '',
          x: r.left,
          y: r.top + scroll,
          width: r.width,
          height: r.height,
          el,
        };
      });
      zones = [
        ...document.querySelectorAll<HTMLElement>(
          '.hero-copy, [data-quiet-zone], .demo-shell, .principles-layout, .faq-layout',
        ),
      ].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - 15,
          y: r.top + scroll - 15,
          width: r.width + 30,
          height: r.height + 30,
        };
      });
      const p = document.getElementById('principles')?.getBoundingClientRect();
      principle = p ? { top: p.top + scroll, bottom: p.bottom + scroll } : null;
      const bridge = document
        .querySelector('[data-particle-flow]')
        ?.getBoundingClientRect();
      flow = bridge
        ? {
            x: bridge.left,
            y: bridge.top + scroll,
            width: bridge.width,
            height: bridge.height,
          }
        : null;
      const f = focus?.getBoundingClientRect();
      focusRect = f
        ? { x: f.left, y: f.top + scroll, width: f.width, height: f.height }
        : null;
      stillFrames = 0;
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function contextLost(e: Event) {
      e.preventDefault();
      install(true);
      measure();
    }
    function install(forceCanvas = false) {
      if (renderer) renderer.destroy();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.remove();
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      container!.appendChild(canvas);
      try {
        renderer =
          !forceCanvas && graphics !== 'canvas' ? webglRenderer(canvas) : null;
        if (!renderer) {
          canvas.remove();
          canvas = document.createElement('canvas');
          canvas.setAttribute('aria-hidden', 'true');
          container!.appendChild(canvas);
          renderer = canvasRenderer(canvas);
        }
      } catch {
        renderer = null;
      }
      document.documentElement.dataset.graphics = renderer?.kind || 'static';
      if (renderer?.kind === 'webgl')
        canvas.addEventListener('webglcontextlost', contextLost);
    }
    function tick(now: number) {
      frame = 0;
      if (ended || document.hidden || !renderer) return;
      const calm = reduce.matches || current.current.paused;
      const step = Math.min(2, (now - (last || now - 16.67)) / 16.67);
      last = now;
      if (!calm) elapsed += step * 0.01667;
      const s = current.current.state;
      if (s !== lastState) {
        lastState = s;
        stateTime = elapsed;
      }
      const justCompleted = s === 'completed' && elapsed - stateTime < 1.6;
      const visible = anchors.filter(
        (a) => a.y + a.height > scroll + 60 && a.y < scroll + height,
      );
      const target = visible.sort(
        (a, b) =>
          Math.abs(a.y + a.height * 0.5 - scroll - height * 0.47) -
          Math.abs(b.y + b.height * 0.5 - scroll - height * 0.47),
      )[0];
      const cx = target ? target.x + target.width * 0.5 : width - 42,
        cy = target ? target.y - scroll + target.height * 0.5 : height * 0.4;
      const cell = target
        ? (Math.min(target.width, target.height) * 0.75) / 14
        : 3.2;
      const resting = Math.sin(elapsed * 0.7) * 4;
      const lookX = !calm
        ? focusRect
          ? focusRect.x + focusRect.width * 0.5 - cx
          : pointer.active
            ? pointer.x - cx
            : 0
        : 0;
      const lookY = !calm
        ? focusRect
          ? focusRect.y - scroll - cy
          : pointer.active
            ? pointer.y - cy
            : 0
        : 0;
      const quiet =
        principle &&
        scroll + height * 0.5 > principle.top &&
        scroll + height * 0.5 < principle.bottom;
      particles.forEach((p, i) => {
        let tx = 0,
          ty = 0,
          size = p.size,
          alpha = 0.34,
          color = colors.mint;
        if (p.kind === 0) {
          // A coherent ribbon across open space; it becomes orderly near the demo.
          const ordered = s === 'organizing' || s === 'completed';
          tx = p.u * width;
          ty = (((p.v * height + scroll * 0.16) % height) + height) % height;
          if (target?.key === 'hero') {
            tx =
              width * (width < 700 ? 0.1 : 0.47) +
              p.u * width * (width < 700 ? 0.8 : 0.5);
            ty =
              cy +
              Math.sin(p.u * 6.28 + p.seed * 0.25) * 85 +
              (p.v - 0.5) * 300;
          }
          if (ordered && i % 4 === 0) {
            tx = cx + ((i % 20) - 10) * 9;
            ty = cy + Math.floor(i / 20) * 5 - 60;
          }
          if (!calm) {
            tx += Math.sin(elapsed * 0.35 + p.seed) * 7;
            ty += Math.cos(elapsed * 0.4 + p.seed) * 7;
          }
          if (focusRect && i < 18 && !calm) {
            tx = focusRect.x + focusRect.width + 12 + (i % 6) * 7;
            ty =
              focusRect.y -
              scroll +
              focusRect.height * 0.5 +
              (Math.floor(i / 6) - 1) * 7;
            alpha = 0.6;
            color = colors.gold;
          } else if (justCompleted && i % 39 === 0) {
            color = colors.gold;
            alpha = 0.65;
          } else {
            color = i % 5 === 0 ? colors.emerald : colors.mint;
            alpha = quiet ? 0.08 : 0.24;
          }
        } else {
          tx = cx + (p.u - 6.75) * cell;
          ty = cy + (p.v - 6.75) * cell + (calm ? 0 : resting);
          if (!calm) {
            tx += Math.max(-8, Math.min(8, lookX * 0.02));
            ty += Math.max(-4, Math.min(4, lookY * 0.01));
          }
          if (p.kind === 3) {
            tx += Math.max(-3, Math.min(3, lookX * 0.01));
            ty += s === 'handoff' ? cell * 0.12 : 0;
          }
          if (s === 'organizing' && i % 7 === 0 && !calm) {
            tx += Math.cos(elapsed * 1.7 + p.seed) * cell * 3;
            ty += Math.sin(elapsed * 1.7 + p.seed) * cell * 3;
          }
          size = cell * p.size;
          alpha = target?.key === 'demo' ? 0.86 : 0.94;
          color =
            p.kind === 3
              ? colors.ivory
              : p.kind === 2
                ? colors.mint
                : colors.emerald;
          if (s === 'handoff' && p.kind !== 3) {
            tx += (p.u - 6.75) * cell * 0.065;
          }
          if (p.kind === 1 && i % 5 === 0) color = colors.navy;
          if (justCompleted && p.kind !== 3 && i % 41 === 0)
            color = colors.gold;
          if (!target) alpha = 0;
        }
        if (calm) {
          p.x = tx;
          p.y = ty;
          p.vx = 0;
          p.vy = 0;
        } else {
          p.vx += (tx - p.x) * motion.spring * step;
          p.vy += (ty - p.y) * motion.spring * step;
          if (p.kind === 0 && pointer.active && !coarse.matches) {
            const dx = p.x - pointer.x,
              dy = p.y - pointer.y,
              d = Math.hypot(dx, dy);
            if (d < motion.pointerRadius && d > 1) {
              const force = (1 - d / motion.pointerRadius) * 1.7;
              p.vx += (dx / d) * force;
              p.vy += (dy / d) * force;
            }
          }
          p.vx *= Math.pow(motion.damping, step);
          p.vy *= Math.pow(motion.damping, step);
          p.x += p.vx * step;
          p.y += p.vy * step;
        }
        if (
          p.kind === 0 &&
          zones.some(
            (z) =>
              p.x > z.x &&
              p.x < z.x + z.width &&
              p.y + scroll > z.y &&
              p.y + scroll < z.y + z.height,
          )
        )
          alpha = 0;
        // A measured, empty rail connects conversation and result without crossing text.
        if (
          p.kind === 0 &&
          i < 24 &&
          flow &&
          (s === 'organizing' || justCompleted)
        ) {
          const progress = calm
            ? 0.5
            : ((elapsed - stateTime) * 1.15 + i / 48) % 1;
          p.x = flow.x + flow.width * (0.12 + progress * 0.76);
          p.y = flow.y - scroll + flow.height * 0.5 + ((i % 3) - 1) * 3;
          size = 2.5;
          alpha = 0.7;
          color = justCompleted ? colors.gold : colors.mint;
        }
        const k = i * 7;
        data[k] = p.x;
        data[k + 1] = p.y;
        data[k + 2] = size;
        data[k + 3] = color[0];
        data[k + 4] = color[1];
        data[k + 5] = color[2];
        data[k + 6] = alpha;
      });
      renderer.draw(data, particles.length, width, height, ratio);
      if (calm) stillFrames++;
      else stillFrames = 0;
      if (!calm || stillFrames < 2) frame = requestAnimationFrame(tick);
    }
    const wake = () => {
      stillFrames = 0;
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      scroll = window.scrollY;
      wake();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || coarse.matches) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onFocus = (e: Event) => {
      const el =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>('button, a, [role="radio"]')
          : null;
      focus = el;
      const r = el?.getBoundingClientRect();
      focusRect = r
        ? { x: r.left, y: r.top + scroll, width: r.width, height: r.height }
        : null;
      wake();
    };
    const onBlur = () => {
      focus = null;
      focusRect = null;
      wake();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else wake();
    };
    install();
    measure();
    const resize = new ResizeObserver(measure);
    document
      .querySelectorAll('[data-particle-anchor],.section-wrap,.demo-shell')
      .forEach((el) => resize.observe(el));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    document.addEventListener('pointerover', onFocus);
    document.addEventListener('pointerout', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('jourvis-motion-change', wake);
    reduce.addEventListener('change', wake);
    return () => {
      ended = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
      document.removeEventListener('pointerover', onFocus);
      document.removeEventListener('pointerout', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('jourvis-motion-change', wake);
      reduce.removeEventListener('change', wake);
      canvas.removeEventListener('webglcontextlost', contextLost);
      renderer?.destroy();
      canvas.remove();
      delete document.documentElement.dataset.graphics;
    };
  }, []);
  useEffect(() => {
    document.dispatchEvent(new Event('jourvis-motion-change'));
  }, [state, paused]);
  return <div ref={host} className="particle-world" aria-hidden="true" />;
}
