/**
 * 全屏小说阅读界面：仿真书本翻页（左右滑 / 点按两侧）。
 * 长节点按屏幕分页；分支集中在节点末的选项页。
 */
import { selectCurrentNode, selectHasChoices, selectParagraphs, selectPeekNext, selectPeekPrev, selectVisibleChoices, useEngineStore } from '../store/useEngineStore';
import { BookReader } from './reader/BookReader';
import { SettingsPanel } from './SettingsPanel';

export function PlayScreen() {
  const story = useEngineStore((s) => s.story);
  const state = useEngineStore((s) => s.state);
  const node = useEngineStore(selectCurrentNode);
  const paragraphs = useEngineStore(selectParagraphs);
  const hasChoices = useEngineStore(selectHasChoices);
  const visibleChoices = useEngineStore(selectVisibleChoices);
  const peekNext = useEngineStore(selectPeekNext);
  const peekPrev = useEngineStore(selectPeekPrev);

  const pick = useEngineStore((s) => s.pick);
  const turnPage = useEngineStore((s) => s.turnPage);
  const rewind = useEngineStore((s) => s.rewind);
  const restart = useEngineStore((s) => s.restart);
  const back = useEngineStore((s) => s.backToTitle);
  const saveTo = useEngineStore((s) => s.saveTo);
  const loadSlot = useEngineStore((s) => s.loadSlot);
  const listSaves = useEngineStore((s) => s.refreshSaves);

  if (!story || !state || !node) return null;

  const canRewind = state.history.length > 0;

  return (
    <BookReader
      title={story.meta.title}
      nodeId={node.id}
      sectionIndex={state.history.length + 1}
      paragraphs={paragraphs}
      choices={visibleChoices}
      hasChoices={hasChoices}
      canRewind={canRewind}
      peekNext={peekNext}
      peekPrev={peekPrev}
      peekGoto={(choiceId) => {
        const c = visibleChoices.find((x) => x.id === choiceId);
        if (!c) return [];
        return story.nodes[c.goto]?.lines ?? [];
      }}
      onEngineNext={turnPage}
      onEnginePrev={rewind}
      onPick={pick}
      settings={({ goPrev, canGoPrev }) => (
        <SettingsPanel
          canRewind={canGoPrev}
          onRewind={goPrev}
          onSave={saveTo}
          onLoad={loadSlot}
          onRestart={restart}
          onBack={back}
          listSaves={listSaves}
        />
      )}
    />
  );
}
