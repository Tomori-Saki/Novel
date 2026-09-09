/** 阅读器翻页决策：节点内视觉分页 vs 引擎推进（下一节点 / 回退）。 */

export type FlipDir = 'next' | 'prev';

export type TurnPlan =
  | { kind: 'local'; nextIndex: number }
  | { kind: 'engine-next' }
  | { kind: 'engine-prev' }
  | { kind: 'engine-pick'; choiceId: string }
  | { kind: 'blocked' };

/** 当前节点最后一页的 visualIndex（含选项页）。 */
export function lastVisualIndex(textPageCount: number, hasChoices: boolean): number {
  const n = Math.max(1, textPageCount);
  return hasChoices ? n : n - 1;
}

export function resolveTurn(opts: {
  dir: FlipDir;
  visualIndex: number;
  textPageCount: number;
  hasChoices: boolean;
  canRewind: boolean;
}): TurnPlan {
  const { dir, visualIndex, textPageCount, hasChoices, canRewind } = opts;
  const last = lastVisualIndex(textPageCount, hasChoices);
  const idx = Math.min(Math.max(0, visualIndex), last);

  if (dir === 'next') {
    if (idx < last) return { kind: 'local', nextIndex: idx + 1 };
    // 选项页必须点选，不能再往右翻
    if (hasChoices) return { kind: 'blocked' };
    return { kind: 'engine-next' };
  }

  if (idx > 0) return { kind: 'local', nextIndex: idx - 1 };
  if (!canRewind) return { kind: 'blocked' };
  return { kind: 'engine-prev' };
}
