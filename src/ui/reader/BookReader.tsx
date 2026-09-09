/**
 * 仿真书本阅读器：跟手卷页 + 点按左右翻页 + 节点内按屏分页。
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { Choice, Line } from '../../engine/types';
import { PageFace } from './PageFace';
import { lastVisualIndex, resolveTurn, type FlipDir, type TurnPlan } from './paging';

export interface PeekNode {
  lines: Line[];
  choices: Choice[];
  hasChoices: boolean;
}

export type PeekNext = PeekNode | 'ending' | null;

interface NavApi {
  goPrev: () => void;
  canGoPrev: boolean;
}

interface Props {
  title: string;
  nodeId: string;
  sectionIndex: number;
  paragraphs: Line[];
  choices: Choice[];
  hasChoices: boolean;
  canRewind: boolean;
  peekNext: PeekNext;
  peekPrev: PeekNode | null;
  peekGoto: (choiceId: string) => Line[];
  onEngineNext: () => void;
  onEnginePrev: () => void;
  onPick: (choiceId: string) => void;
  settings: (api: NavApi) => ReactNode;
}

type SheetContent =
  | { type: 'text'; paragraphs: Line[]; pageIndex: number | 'last' }
  | { type: 'choices'; choices: Choice[] }
  | { type: 'ending' }
  | { type: 'blank' };

interface FlipState {
  phase: 'idle' | 'dragging' | 'animating';
  dir: FlipDir;
  progress: number;
  blocked: boolean;
  dest: SheetContent;
  plan: TurnPlan;
}

const IDLE: FlipState = {
  phase: 'idle',
  dir: 'next',
  progress: 0,
  blocked: false,
  dest: { type: 'blank' },
  plan: { kind: 'blocked' },
};

const TAP_SLOP = 14;
const COMPLETE_PROGRESS = 0.2;
const COMPLETE_VELOCITY = 0.42;

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function animateProgress(from: number, to: number, onFrame: (p: number) => void, onDone: () => void): () => void {
  if (prefersReducedMotion() || from === to) {
    onFrame(to);
    onDone();
    return () => {};
  }
  const duration = 260 + Math.abs(to - from) * 240;
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - (1 - t) ** 3;
    onFrame(from + (to - from) * e);
    if (t < 1) raf = requestAnimationFrame(tick);
    else onDone();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function SheetView({
  content,
  onTextPageCount,
  onPick,
}: {
  content: SheetContent;
  onTextPageCount?: (n: number) => void;
  onPick?: (id: string) => void;
}) {
  if (content.type === 'blank') return <div className="page-clip" />;
  if (content.type === 'ending') {
    return (
      <div className="page-clip page-leaf">
        <p className="dim">纸页在此用尽。</p>
        <p>故事将翻向结局。</p>
      </div>
    );
  }
  if (content.type === 'choices') {
    return (
      <article className="choices-page">
        <h2 className="choices-heading">故事在此分岔</h2>
        {content.choices.length === 0 ? (
          <p className="dim">（此刻没有可行的方向，向左翻回正文。）</p>
        ) : (
          <div className="choices">
            {content.choices.map((c) => (
              <button
                key={c.id}
                className="choice-card no-turn"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick?.(c.id);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </article>
    );
  }
  return <PageFace paragraphs={content.paragraphs} pageIndex={content.pageIndex} onPageCount={onTextPageCount} />;
}

export function BookReader(p: Props) {
  const {
    title,
    nodeId,
    sectionIndex,
    paragraphs,
    choices,
    hasChoices,
    canRewind,
    peekNext,
    peekPrev,
    peekGoto,
    onEngineNext,
    onEnginePrev,
    onPick,
    settings,
  } = p;

  const shellRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const landLastRef = useRef(false);
  const skipResetRef = useRef(false);
  const hasChoicesRef = useRef(hasChoices);
  hasChoicesRef.current = hasChoices;
  const flipRef = useRef<FlipState>(IDLE);
  const cancelAnim = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);

  const [textPageCount, setTextPageCount] = useState(1);
  const [visualIndex, setVisualIndex] = useState(0);
  const [landLast, setLandLast] = useState(false);
  const [flip, setFlip] = useState<FlipState>(IDLE);
  const [chromeOpen, setChromeOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hint, setHint] = useState(() => {
    try {
      return sessionStorage.getItem('reader-hint-seen') !== '1';
    } catch {
      return true;
    }
  });

  flipRef.current = flip;

  const handlePageCount = useCallback((n: number) => {
    setTextPageCount(n);
    if (landLastRef.current) {
      const hc = hasChoicesRef.current;
      setVisualIndex(hc ? n : Math.max(0, n - 1));
      landLastRef.current = false;
      setLandLast(false);
    }
  }, []);

  useLayoutEffect(() => {
    cancelAnim.current?.();
    cancelAnim.current = null;
    busyRef.current = false;
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setVisualIndex(0);
    setLandLast(false);
    landLastRef.current = false;
    setFlip(IDLE);
  }, [nodeId]);

  useEffect(() => {
    readerRef.current?.focus();
  }, [nodeId]);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => {
      setHint(false);
      try {
        sessionStorage.setItem('reader-hint-seen', '1');
      } catch {
        /* ignore */
      }
    }, 3600);
    return () => window.clearTimeout(t);
  }, [hint]);

  const last = lastVisualIndex(textPageCount, hasChoices);
  const idx = Math.min(visualIndex, last);

  const currentSheet = (): SheetContent => {
    if (hasChoices && (landLast || idx >= textPageCount)) {
      return { type: 'choices', choices };
    }
    if (landLast) return { type: 'text', paragraphs, pageIndex: 'last' };
    return { type: 'text', paragraphs, pageIndex: Math.max(0, idx) };
  };

  const buildDest = (plan: TurnPlan, pickId?: string): SheetContent => {
    if (plan.kind === 'blocked') return { type: 'blank' };
    if (plan.kind === 'local') {
      if (hasChoices && plan.nextIndex >= textPageCount) return { type: 'choices', choices };
      return { type: 'text', paragraphs, pageIndex: plan.nextIndex };
    }
    if (plan.kind === 'engine-next') {
      if (peekNext === 'ending' || peekNext === null) return { type: 'ending' };
      return { type: 'text', paragraphs: peekNext.lines, pageIndex: 0 };
    }
    if (plan.kind === 'engine-prev') {
      if (!peekPrev) return { type: 'blank' };
      if (peekPrev.hasChoices) return { type: 'choices', choices: peekPrev.choices };
      return { type: 'text', paragraphs: peekPrev.lines, pageIndex: 'last' };
    }
    const lines = peekGoto(pickId ?? plan.choiceId);
    return { type: 'text', paragraphs: lines, pageIndex: 0 };
  };

  const commitPlan = (plan: TurnPlan) => {
    cancelAnim.current = null;
    setFlip(IDLE);
    busyRef.current = false;
    if (plan.kind === 'local') {
      setVisualIndex(plan.nextIndex);
      return;
    }
    if (plan.kind === 'engine-next') {
      landLastRef.current = false;
      setLandLast(false);
      setVisualIndex(0);
      onEngineNext();
      return;
    }
    if (plan.kind === 'engine-prev') {
      skipResetRef.current = true;
      landLastRef.current = true;
      setLandLast(true);
      onEnginePrev();
      return;
    }
    if (plan.kind === 'engine-pick') {
      landLastRef.current = false;
      setLandLast(false);
      setVisualIndex(0);
      onPick(plan.choiceId);
    }
  };

  const playTo = (
    from: number,
    to: number,
    base: Omit<FlipState, 'phase' | 'progress'>,
    onEnd: () => void,
  ) => {
    cancelAnim.current?.();
    busyRef.current = true;
    setFlip({ ...base, phase: 'animating', progress: from });
    cancelAnim.current = animateProgress(
      from,
      to,
      (progress) => setFlip((s) => ({ ...s, progress })),
      () => {
        cancelAnim.current = null;
        onEnd();
      },
    );
  };

  const startFlip = (dir: FlipDir) => {
    if (busyRef.current || flipRef.current.phase !== 'idle') return;
    const plan = resolveTurn({
      dir,
      visualIndex: idx,
      textPageCount,
      hasChoices,
      canRewind,
    });
    const dest = buildDest(plan);
    const blocked = plan.kind === 'blocked';
    const base = { dir, blocked, dest, plan };
    setChromeOpen(false);
    setMenuOpen(false);
    if (blocked) {
      playTo(0, 0.13, base, () => {
        playTo(0.13, 0, base, () => {
          setFlip(IDLE);
          busyRef.current = false;
        });
      });
      return;
    }
    playTo(0, 1, base, () => commitPlan(plan));
  };

  const startPick = (choiceId: string) => {
    if (busyRef.current) return;
    const plan: TurnPlan = { kind: 'engine-pick', choiceId };
    const dest = buildDest(plan, choiceId);
    const base = { dir: 'next' as const, blocked: false, dest, plan };
    setChromeOpen(false);
    setMenuOpen(false);
    playTo(0, 1, base, () => commitPlan(plan));
  };

  const ptr = useRef<{
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastT: number;
    dragging: boolean;
    dir: FlipDir;
  } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.no-turn')) return;
    if (busyRef.current || flipRef.current.phase === 'animating') return;
    ptr.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastT: e.timeStamp,
      dragging: false,
      dir: 'next',
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = ptr.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;

    if (!s.dragging) {
      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        ptr.current = null;
        return;
      }
      const dir: FlipDir = dx < 0 ? 'next' : 'prev';
      s.dragging = true;
      s.dir = dir;
      shellRef.current?.setPointerCapture(e.pointerId);
      const plan = resolveTurn({
        dir,
        visualIndex: idx,
        textPageCount,
        hasChoices,
        canRewind,
      });
      setChromeOpen(false);
      setMenuOpen(false);
      setHint(false);
      setFlip({
        phase: 'dragging',
        dir,
        progress: 0,
        blocked: plan.kind === 'blocked',
        dest: buildDest(plan),
        plan,
      });
    }

    const w = shellRef.current?.clientWidth || window.innerWidth;
    const raw = s.dir === 'next' ? s.x - e.clientX : e.clientX - s.x;
    const f = flipRef.current;
    const progress = f.blocked
      ? Math.min(0.16, Math.max(0, raw / w) * 0.4)
      : Math.min(1, Math.max(0, raw / (w * 0.88)));
    setFlip((st) => ({ ...st, progress }));
  };

  const finishPointer = (e: PointerEvent<HTMLDivElement>) => {
    const s = ptr.current;
    if (!s || s.id !== e.pointerId) return;
    ptr.current = null;
    const w = shellRef.current?.clientWidth || window.innerWidth;

    if (!s.dragging) {
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      const ratio = e.clientX / w;
      if (ratio < 0.28) startFlip('prev');
      else if (ratio > 0.72) startFlip('next');
      else setChromeOpen((v) => !v);
      return;
    }

    const f = flipRef.current;
    const dt = Math.max(1, e.timeStamp - s.lastT);
    const vx = (e.clientX - s.lastX) / dt;
    const fast = f.dir === 'next' ? vx < -COMPLETE_VELOCITY : vx > COMPLETE_VELOCITY;
    const complete = !f.blocked && (f.progress >= COMPLETE_PROGRESS || fast);
    const base = { dir: f.dir, blocked: f.blocked, dest: f.dest, plan: f.plan };
    if (complete) playTo(f.progress, 1, base, () => commitPlan(f.plan));
    else
      playTo(f.progress, 0, base, () => {
        setFlip(IDLE);
        busyRef.current = false;
      });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      startFlip('next');
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
      e.preventDefault();
      startFlip('prev');
    } else if (e.key === 'Escape') {
      setMenuOpen(false);
      setChromeOpen((v) => !v);
    }
  };

  const startFlipRef = useRef(startFlip);
  startFlipRef.current = startFlip;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      if (busyRef.current) return;
      if (Math.abs(ev.deltaY) < 20 && Math.abs(ev.deltaX) < 20) return;
      ev.preventDefault();
      const goNext = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX > 0 : ev.deltaY > 0;
      startFlipRef.current(goNext ? 'next' : 'prev');
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const flipping = flip.phase !== 'idle' && flip.progress > 0.001;
  const pFold = flip.progress;
  const curlW = 10 + 42 * Math.sin(Math.min(1, pFold) * Math.PI);
  const totalPages = last + 1;
  const pageLabel = `${Math.min(idx, last) + 1} / ${totalPages}`;
  const canGoPrev = idx > 0 || canRewind;
  const foldStyle = {
    '--fold': `${(1 - pFold) * 100}%`,
    '--fold-inv': `${pFold * 100}%`,
  } as CSSProperties;

  return (
    <div
      className="reader"
      ref={readerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`${title} 阅读器`}
    >
      <div
        className={`book-shell${flipping ? ' is-flipping' : ''}${flip.phase === 'dragging' ? ' is-grabbing' : ''}`}
        ref={shellRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        <div className="book-spine" aria-hidden />
        <div className="book-edge" aria-hidden />

        <div className="book-stack" style={foldStyle}>
          {flipping && (
            <div className="sheet sheet-under">
              <div className="sheet-pad">
                <div className="sheet-body">
                  <SheetView content={flip.dest} />
                </div>
              </div>
            </div>
          )}

          <div
            className={`sheet sheet-current sheet-fold-${flip.dir}`}
            style={{
              clipPath: flipping
                ? flip.dir === 'next'
                  ? `inset(0 ${pFold * 100}% 0 0)`
                  : `inset(0 0 0 ${pFold * 100}%)`
                : undefined,
            }}
          >
            <div className="sheet-pad">
              <div className="sheet-body">
                <div className="page-measure" aria-hidden>
                  <PageFace key={`m:${nodeId}`} paragraphs={paragraphs} pageIndex={0} onPageCount={handlePageCount} />
                </div>
                <SheetView key={`v:${nodeId}`} content={currentSheet()} onPick={startPick} />
              </div>
            </div>
          </div>

          {flipping && (
            <>
              <div
                className={`book-cast book-cast-${flip.dir}`}
                style={{ opacity: 0.15 + 0.55 * Math.sin(pFold * Math.PI) }}
              />
              <div
                className={`book-curl book-curl-${flip.dir}`}
                style={{
                  width: curlW,
                  opacity: pFold < 0.03 || pFold > 0.97 ? 0 : 1,
                }}
              />
            </>
          )}
        </div>

        {chromeOpen && (
          <header className="reader-chrome no-turn">
            <span className="reader-title">{title}</span>
            <details
              className="reader-menu"
              open={menuOpen}
              onToggle={(e) => setMenuOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary aria-label="菜单">☰</summary>
              <div className="fab-panel reader-menu-panel">
                {settings({ goPrev: () => startFlip('prev'), canGoPrev })}
              </div>
            </details>
          </header>
        )}

        <footer className="reader-pagenum">
          <span>
            第 {sectionIndex} 节 · {pageLabel}
          </span>
        </footer>

        {hint && <div className="reader-hint no-turn">左右滑动翻页 · 点按中间显示菜单</div>}
      </div>
    </div>
  );
}
