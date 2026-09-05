/**
 * 引擎状态绑定（小说阅读模式）：用 zustand 把纯函数引擎接到 React。
 * UI 只跟这个 store 打交道，完全不碰引擎/parser 细节。
 *
 * 阅读模型：screen = title | play | ending；play 内部 page = reading（整页正文）| choices（单独选项页）。
 */
import { create } from 'zustand';
import type { Choice, GameState, Line, Story, StoryNode } from '../engine/types';
import { availableChoices, choose, nextPage, rewind as engRewind } from '../engine/reducer';
import { createInitialState } from '../engine/state';
import { findEnding } from '../engine/ending';
import {
  createDefaultStorage,
  listSaves,
  loadGame,
  saveGame,
  type SaveMeta,
  type Storage,
} from '../engine/persistence';
import { getStories } from '../content/registry';
import type { CompileError } from '../parser/compiler';
import type { StorySummary } from '../content/loadStories';

export type Screen = 'title' | 'play' | 'ending';
export type Page = 'reading' | 'choices';

interface EngineStore {
  manifest: StorySummary[];
  compileErrors: CompileError[];
  screen: Screen;
  page: Page;
  story: Story | null;
  state: GameState | null;
  storage: Storage;

  newGame: (id: string) => void;
  goChoices: () => void;
  goReading: () => void;
  pick: (choiceId: string) => void;
  turnPage: () => void;
  rewind: () => void;
  restart: () => void;
  backToTitle: () => void;
  saveTo: (slot: string) => void;
  loadSlot: (slot: string) => void;
  refreshSaves: () => SaveMeta[];
}

const loaded = getStories();

export const useEngineStore = create<EngineStore>((set, get) => ({
  manifest: loaded.manifest,
  compileErrors: loaded.errors,
  screen: 'title',
  page: 'reading',
  story: null,
  state: null,
  storage: createDefaultStorage(),

  newGame: (id) => {
    const story = loaded.stories.find((s) => s.meta.id === id) ?? null;
    if (!story) return;
    set({ story, state: createInitialState(story), screen: 'play', page: 'reading' });
  },

  goChoices: () => set({ page: 'choices' }),
  goReading: () => set({ page: 'reading' }),

  pick: (choiceId) => {
    const { story, state } = get();
    if (!story || !state || state.ended) return;
    const next = choose(state, story, choiceId);
    // 选择后回到阅读页，展示目标节点正文
    set({ state: next, page: 'reading' });
  },

  turnPage: () => {
    const { story, state } = get();
    if (!story || !state || state.ended) return;
    const next = nextPage(state, story);
    set({ state: next, page: 'reading', screen: next.ended ? 'ending' : 'play' });
  },

  rewind: () => {
    const { state } = get();
    if (!state) return;
    const next = engRewind(state);
    set({ state: next, page: 'reading', screen: next.ended ? 'ending' : 'play' });
  },

  restart: () => {
    const { story } = get();
    if (!story) return;
    set({ state: createInitialState(story), screen: 'play', page: 'reading' });
  },

  backToTitle: () => set({ screen: 'title', story: null, state: null, page: 'reading' }),

  saveTo: (slot) => {
    const { storage, state } = get();
    if (!state) return;
    saveGame(storage, slot, state);
  },

  loadSlot: (slot) => {
    const { storage } = get();
    const rec = loadGame(storage, slot);
    if (!rec) return;
    const story = loaded.stories.find((s) => s.meta.id === rec.state.storyId) ?? null;
    if (!story) return;
    set({ story, state: rec.state, screen: rec.state.ended ? 'ending' : 'play', page: 'reading' });
  },

  refreshSaves: () => listSaves(get().storage),
}));

/** —— 供组件使用的派生选择器（集中在此，UI 不直接依赖引擎内部） —— */

export function selectCurrentNode(s: EngineStore): StoryNode | null {
  if (!s.story || !s.state) return null;
  return s.story.nodes[s.state.currentNodeId] ?? null;
}

/** 当前页的全部正文段落 */
export function selectParagraphs(s: EngineStore): Line[] {
  return selectCurrentNode(s)?.lines ?? [];
}

/** 当前节点在给定状态下可见（when 通过）的选项 */
export function selectVisibleChoices(s: EngineStore): Choice[] {
  if (!s.story || !s.state) return [];
  return availableChoices(s.story, s.state);
}

/** 当前节点是否含分支选项（决定阅读页底部是「进入选项页」还是「下一页」） */
export function selectHasChoices(s: EngineStore): boolean {
  return (selectCurrentNode(s)?.choices.length ?? 0) > 0;
}

/** 当前节点是否叶子节点（无选项且无 goto） */
export function selectIsLeaf(s: EngineStore): boolean {
  const node = selectCurrentNode(s);
  if (!node) return false;
  return node.choices.length === 0 && !node.next;
}

export function selectEndedEnding(s: EngineStore) {
  if (!s.story || !s.state || !s.state.ended) return null;
  return findEnding(s.story, s.state.ended);
}
