'use client';

import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type FrameManifest = {
  frames: number;
  pattern: string;
  width: number;
  height: number;
};

export type SequenceBeat = {
  kicker: string;
  title: ReactNode;
  body: string;
  align?: 'left' | 'right';
  action?: {
    label: string;
    href: string;
    external?: boolean;
  };
};

type ScrollSequenceProps = {
  id?: string;
  ariaLabel: string;
  beats: readonly SequenceBeat[];
  scrollLabel: string;
  frameLabel: string;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function smoothstep(value: number) {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
}

function frameUrl(manifest: FrameManifest, frame: number) {
  const name = manifest.pattern.replace(/%0(\d+)d/, (_, width: string) => String(frame).padStart(Number(width), '0'));
  return `/sequence/${name}`;
}

export default function ScrollSequence({ id, ariaLabel, beats, scrollLabel, frameLabel }: ScrollSequenceProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeBeat, setActiveBeat] = useState(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const beatCount = beats.length;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!root || !canvas || !context || beatCount === 0) return;

    let disposed = false;
    let animationFrame = 0;
    let currentSlot = 0;
    let indices: number[] = [];
    let manifest: FrameManifest | null = null;
    const images = new Map<number, HTMLImageElement>();
    const pending = new Map<number, Promise<HTMLImageElement | null>>();
    const permanent = new Set<number>();
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = motionQuery.matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    setReducedMotion(reduced);

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
    };

    const nearestLoaded = (slot: number) => {
      if (images.has(slot)) return slot;
      for (let distance = 1; distance < indices.length; distance += 1) {
        if (images.has(slot - distance)) return slot - distance;
        if (images.has(slot + distance)) return slot + distance;
      }
      return -1;
    };

    const draw = (slot: number) => {
      const loadedSlot = nearestLoaded(slot);
      if (loadedSlot < 0) return;
      const image = images.get(loadedSlot);
      if (!image) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;

      context.fillStyle = '#070605';
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(image, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
      currentSlot = slot;
    };

    const load = (slot: number) => {
      if (!manifest || slot < 0 || slot >= indices.length) return Promise.resolve(null);
      const loaded = images.get(slot);
      if (loaded) return Promise.resolve(loaded);
      const inFlight = pending.get(slot);
      if (inFlight) return inFlight;

      const task = new Promise<HTMLImageElement | null>((resolve) => {
        const image = new window.Image();
        image.decoding = 'async';
        image.onload = () => {
          pending.delete(slot);
          if (disposed) {
            image.src = '';
            resolve(null);
            return;
          }
          images.set(slot, image);
          if (slot === currentSlot) draw(currentSlot);
          resolve(image);
        };
        image.onerror = () => {
          pending.delete(slot);
          resolve(null);
        };
        image.src = frameUrl(manifest, indices[slot]);
      });

      pending.set(slot, task);
      return task;
    };

    const keepWindow = (slot: number) => {
      const radius = window.innerWidth > 0 && window.innerWidth <= 768 ? 4 : 7;
      for (let distance = 0; distance <= radius; distance += 1) {
        void load(slot - distance);
        if (distance > 0) void load(slot + distance);
      }

      for (const [loadedSlot, image] of images) {
        if (!permanent.has(loadedSlot) && Math.abs(loadedSlot - slot) > radius + 2) {
          images.delete(loadedSlot);
          image.src = '';
        }
      }
    };

    const progress = () => {
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      return travel > 0 ? clamp(-rect.top / travel) : 0;
    };

    const update = () => {
      animationFrame = 0;
      if (!indices.length) return;

      const rawProgress = progress();
      const easedProgress = smoothstep(rawProgress);
      const slot = Math.min(indices.length - 1, Math.round(easedProgress * (indices.length - 1)));
      const nextBeat = Math.min(beatCount - 1, Math.floor(rawProgress * beatCount));

      root.style.setProperty('--story-progress', `${rawProgress}`);
      setActiveBeat((previous) => previous === nextBeat ? previous : nextBeat);
      if (slot !== currentSlot || nearestLoaded(slot) !== slot) draw(slot);
      keepWindow(slot);
    };

    const onScroll = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(update);
    };

    const onResize = () => {
      resizeCanvas();
      draw(currentSlot);
      onScroll();
    };

    const preloadCoarsePass = async () => {
      const slots = Array.from(permanent);
      const lanes = 8;
      for (let index = 0; index < slots.length && !disposed; index += lanes) {
        await Promise.all(slots.slice(index, index + lanes).map(load));
        draw(currentSlot);
      }
    };

    const start = async () => {
      try {
        const response = await fetch('/sequence/manifest.json');
        if (!response.ok) throw new Error(`Frame manifest returned ${response.status}`);
        manifest = await response.json() as FrameManifest;

        const isNarrow = window.innerWidth > 0 && window.innerWidth <= 768;
        const stride = isNarrow || connection?.saveData ? 2 : 1;
        indices = Array.from({ length: Math.ceil(manifest.frames / stride) }, (_, index) => index * stride)
          .filter((frame) => frame < manifest!.frames);
        if (indices.at(-1) !== manifest.frames - 1) indices.push(manifest.frames - 1);

        root.style.setProperty('--sequence-travel', `${indices.length * 10}px`);
        indices.forEach((_, slot) => {
          if (slot % 8 === 0 || slot === indices.length - 1) permanent.add(slot);
        });

        resizeCanvas();
        const first = await load(0);
        if (disposed || !first) return;
        draw(0);
        setReady(true);

        if (reduced) return;

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        update();
        void preloadCoarsePass();
      } catch {
        if (!disposed) setReady(false);
      }
    };

    void start();

    return () => {
      disposed = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      pending.clear();
      for (const image of images.values()) image.src = '';
      images.clear();
    };
  }, [beatCount]);

  return (
    <section
      ref={rootRef}
      className={`scroll-story${ready ? ' is-ready' : ''}${reducedMotion ? ' is-reduced' : ''}`}
      id={id}
      aria-label={ariaLabel}
      style={{ '--sequence-travel': '1200px' } as CSSProperties}
    >
      <div className="scroll-story-sticky">
        <div className="scroll-story-visual" aria-hidden="true">
          <Image
            className="scroll-story-poster"
            src="/frames/portal-first.png"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <canvas ref={canvasRef} />
          <div className="scroll-story-shade" />
          <div className="scroll-story-grain" />
        </div>

        <div className="scroll-story-meta" aria-hidden="true">
          <span>ORBIT / 01</span>
          <span>{frameLabel}</span>
        </div>

        <div className="scroll-story-beats">
          {beats.map((beat, index) => (
            <article
              className={`scroll-story-beat scroll-story-beat-${beat.align ?? 'left'}${index === activeBeat ? ' is-active' : ''}`}
              aria-hidden={!reducedMotion && index !== activeBeat}
              key={`${beat.kicker}-${index}`}
            >
              <p>{beat.kicker}</p>
              <h1>{beat.title}</h1>
              <div className="scroll-story-body">{beat.body}</div>
              {beat.action ? (
                <a
                  className="story-action"
                  href={beat.action.href}
                  target={beat.action.external ? '_blank' : undefined}
                  rel={beat.action.external ? 'noreferrer' : undefined}
                >
                  {beat.action.label}<span aria-hidden="true">{beat.action.external ? '↗' : '↓'}</span>
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <div className="scroll-story-cue" aria-hidden="true">
          <span>{scrollLabel}</span>
          <i><b /></i>
        </div>

        <div className="scroll-story-counter" aria-hidden="true">
          <span>{String(activeBeat + 1).padStart(2, '0')}</span>
          <i />
          <span>{String(beatCount).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  );
}
