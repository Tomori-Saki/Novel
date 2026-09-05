/** 结局页：展示命中结局的标题与正文，提供重开/返回。 */
import { selectEndedEnding, useEngineStore } from '../store/useEngineStore';

export function EndingScreen() {
  const story = useEngineStore((s) => s.story);
  const ending = useEngineStore(selectEndedEnding);
  const restart = useEngineStore((s) => s.restart);
  const back = useEngineStore((s) => s.backToTitle);

  return (
    <div className="ending">
      <div className="kicker">{story?.meta.title ?? '剧情'} · 结局</div>
      <h2>{ending?.title ?? '剧终'}</h2>
      <div className="text">{ending?.text ?? '故事在这里画下了句点。'}</div>
      <div className="row-between">
        <button onClick={restart}>⟲ 再来一次</button>
        <button className="primary" onClick={back}>
          ☰ 返回标题
        </button>
      </div>
    </div>
  );
}
