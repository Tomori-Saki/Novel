import { describe, expect, it } from 'vitest';
import { lastVisualIndex, resolveTurn } from '../src/ui/reader/paging';

describe('阅读器视觉翻页', () => {
  it('无选项时最后一页是正文末页', () => {
    expect(lastVisualIndex(3, false)).toBe(2);
    expect(lastVisualIndex(1, false)).toBe(0);
  });

  it('有选项时最后一页仍是正文末页（选项在对页）', () => {
    expect(lastVisualIndex(3, true)).toBe(2);
    expect(lastVisualIndex(1, true)).toBe(0);
  });

  it('节点内向后翻走 local', () => {
    expect(
      resolveTurn({
        dir: 'next',
        visualIndex: 0,
        textPageCount: 3,
        hasChoices: false,
        canRewind: false,
      }),
    ).toEqual({ kind: 'local', nextIndex: 1 });
  });

  it('正文末页且有选项 → 不能再往后翻，需点选', () => {
    expect(
      resolveTurn({
        dir: 'next',
        visualIndex: 2,
        textPageCount: 3,
        hasChoices: true,
        canRewind: true,
      }),
    ).toEqual({ kind: 'blocked' });
  });

  it('正文末页且无选项 → 引擎下一节点', () => {
    expect(
      resolveTurn({
        dir: 'next',
        visualIndex: 2,
        textPageCount: 3,
        hasChoices: false,
        canRewind: true,
      }),
    ).toEqual({ kind: 'engine-next' });
  });

  it('仅一页正文且有选项 → 不能再下一页', () => {
    expect(
      resolveTurn({
        dir: 'next',
        visualIndex: 0,
        textPageCount: 1,
        hasChoices: true,
        canRewind: true,
      }),
    ).toEqual({ kind: 'blocked' });
  });

  it('首页且无历史 → 上一页被挡住', () => {
    expect(
      resolveTurn({
        dir: 'prev',
        visualIndex: 0,
        textPageCount: 3,
        hasChoices: false,
        canRewind: false,
      }),
    ).toEqual({ kind: 'blocked' });
  });

  it('首页且有历史 → 引擎回退', () => {
    expect(
      resolveTurn({
        dir: 'prev',
        visualIndex: 0,
        textPageCount: 3,
        hasChoices: false,
        canRewind: true,
      }),
    ).toEqual({ kind: 'engine-prev' });
  });
});
