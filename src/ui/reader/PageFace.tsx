/**
 * 将节点正文按屏幕高度切成「一屏一页」（CSS 多栏分页）。
 * pageIndex = 'last' 用于回退时落在上一节点末页。
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { Line } from '../../engine/types';

interface Props {
  paragraphs: Line[];
  pageIndex: number | 'last';
  onPageCount?: (count: number) => void;
}

export function PageFace({ paragraphs, pageIndex, onPageCount }: Props) {
  const clipRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const onCountRef = useRef(onPageCount);
  onCountRef.current = onPageCount;

  const [metrics, setMetrics] = useState({ count: 1, width: 0 });

  const measure = useCallback(() => {
    if (paragraphs.length === 0) {
      setMetrics({ count: 1, width: clipRef.current?.clientWidth ?? 0 });
      onCountRef.current?.(1);
      return;
    }
    const clip = clipRef.current;
    const flow = flowRef.current;
    if (!clip || !flow) return;
    const w = clip.clientWidth;
    if (w <= 0) return;
    flow.style.columnWidth = `${w}px`;
    flow.style.width = `${w}px`;
    const sw = flow.scrollWidth;
    const count = Math.max(1, Math.ceil(sw / w - 0.02));
    setMetrics({ count, width: w });
    onCountRef.current?.(count);
  }, [paragraphs]);

  useLayoutEffect(() => {
    measure();
    const clip = clipRef.current;
    if (!clip) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(clip);
    void document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);

  if (paragraphs.length === 0) {
    return (
      <div className="page-clip" ref={clipRef}>
        <p className="dim">（本页暂无正文，点按右侧继续。）</p>
      </div>
    );
  }

  const idx =
    pageIndex === 'last'
      ? Math.max(0, metrics.count - 1)
      : Math.min(Math.max(0, pageIndex), Math.max(0, metrics.count - 1));

  return (
    <div className="page-clip" ref={clipRef}>
      <div
        className="page-flow"
        ref={flowRef}
        style={{
          transform: metrics.width > 0 ? `translate3d(-${idx * metrics.width}px,0,0)` : undefined,
        }}
      >
        {paragraphs.map((ln, i) => (
          <p key={i} className={ln.speaker ? 'line-say' : 'line-narr'}>
            {ln.text}
          </p>
        ))}
      </div>
    </div>
  );
}
