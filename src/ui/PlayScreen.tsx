/**
 * 全屏小说阅读界面：整节点正文成一页文章，占满屏幕。
 * 交互：点击屏幕左半边 = 上一页，右半边 = 下一页；分支集中在单独的选项页。
 * 不展示信息差等引擎内部概念（那属于创作侧），也不设顶部栏。
 */
import type { MouseEvent } from 'react';
import { selectCurrentNode, selectHasChoices, selectParagraphs, selectVisibleChoices, useEngineStore } from '../store/useEngineStore';
import { SettingsPanel } from './SettingsPanel';

export function PlayScreen() {
  const story = useEngineStore((s) => s.story);
  const state = useEngineStore((s) => s.state);
  const page = useEngineStore((s) => s.page);
  const node = useEngineStore(selectCurrentNode);
  const paragraphs = useEngineStore(selectParagraphs);
  const hasChoices = useEngineStore(selectHasChoices);
  const visibleChoices = useEngineStore(selectVisibleChoices);

  const goChoices = useEngineStore((s) => s.goChoices);
  const goReading = useEngineStore((s) => s.goReading);
  const pick = useEngineStore((s) => s.pick);
  const turnPage = useEngineStore((s) => s.turnPage);
  const rewind = useEngineStore((s) => s.rewind);
  const restart = useEngineStore((s) => s.restart);
  const back = useEngineStore((s) => s.backToTitle);
  const saveTo = useEngineStore((s) => s.saveTo);
  const loadSlot = useEngineStore((s) => s.loadSlot);
  const listSaves = useEngineStore((s) => s.refreshSaves);

  const isChoices = page === 'choices';

  // 右半屏 / → ：阅读页推进（有分支则进入选项页），选项页则返回正文
  const goNext = () => {
    if (isChoices) return goReading();
    if (hasChoices) return goChoices();
    turnPage();
  };
  // 左半屏 / ← ：阅读页回退上一页，选项页返回正文
  const goPrev = () => {
    if (isChoices) return goReading();
    rewind();
  };

  const onScreenClick = (e: MouseEvent<HTMLDivElement>) => {
    // 点击落在交互控件（选项卡 / 浮动菜单）上时不翻页
    if ((e.target as HTMLElement).closest('.no-turn')) return;
    if (e.clientX < window.innerWidth / 2) goPrev();
    else goNext();
  };

  if (!story || !state || !node) return null;

  const canRewind = state.history.length > 0;

  return (
    <div
      className="reader"
      tabIndex={0}
      onClick={onScreenClick}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') goNext();
        else if (e.key === 'ArrowLeft') goPrev();
      }}
    >
      <div className="reader-body">
        {isChoices ? (
          <article className="page choices-page" key={`ch:${node.id}`}>
            <h2 className="choices-heading">故事在此分岔</h2>
            {visibleChoices.length === 0 ? (
              <p className="dim">（此刻没有可行的方向，点击任意一侧返回正文。）</p>
            ) : (
              <div className="choices">
                {visibleChoices.map((c) => (
                  <button
                    key={c.id}
                    className="choice-card no-turn"
                    onClick={(e) => {
                      e.stopPropagation();
                      pick(c.id);
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </article>
        ) : (
          <article className="page" key={state.currentNodeId}>
            {paragraphs.length === 0 ? (
              <p className="dim">（本页暂无正文，点击继续。）</p>
            ) : (
              paragraphs.map((ln, i) => <p key={i}>{ln.text}</p>)
            )}
          </article>
        )}
      </div>

      <footer className="reader-foot no-turn">
        <span>{story.meta.title}</span>
        <span className="rf-dot">·</span>
        <span>第 {state.history.length + 1} 页</span>
        {isChoices && (
          <>
            <span className="rf-dot">·</span>
            <span className="rf-tag">抉择 · 选择一项</span>
          </>
        )}
      </footer>

      <details className="fab no-turn" onClick={(e) => e.stopPropagation()}>
        <summary>☰</summary>
        <div className="fab-panel">
          <SettingsPanel
            canRewind={canRewind}
            onRewind={rewind}
            onSave={saveTo}
            onLoad={loadSlot}
            onRestart={restart}
            onBack={back}
            listSaves={listSaves}
          />
        </div>
      </details>
    </div>
  );
}
