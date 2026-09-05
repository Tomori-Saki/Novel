/** 标题页：从已加载剧情清单里选择开局，或读取存档。 */
import { useEngineStore } from '../store/useEngineStore';
import { ImportDebugPanel } from './ImportDebugPanel';

export function TitleScreen() {
  const manifest = useEngineStore((s) => s.manifest);
  const errors = useEngineStore((s) => s.compileErrors);
  const newGame = useEngineStore((s) => s.newGame);
  const loadSlot = useEngineStore((s) => s.loadSlot);
  const refreshSaves = useEngineStore((s) => s.refreshSaves);

  const saves = refreshSaves();

  return (
    <div className="title-screen">
      <h1>互动小说播放器</h1>
      <div className="sub">模块化引擎 · 信息差驱动 · .txt DSL 剧情热加载</div>

      {manifest.length === 0 ? (
        <div className="empty">
          未检测到可用剧情。请把 <code>*.story.txt</code> 放入 <code>src/stories/&lt;剧情id&gt;/</code> 目录。
        </div>
      ) : (
        <div className="story-grid">
          {manifest.map((m) => (
            <div className="story-card" key={m.id}>
              <h3>{m.title}</h3>
              <div className="meta">
                id：{m.id}
                <br />
                节点 {m.nodeCount} · 角色 {m.charCount} · 结局 {m.endingCount}
                <br />
                源：{m.sources.map((s) => s.split('/').pop()).join(', ')}
              </div>
              <button className="primary" onClick={() => newGame(m.id)}>
                ▶ 开始
              </button>
            </div>
          ))}
        </div>
      )}

      {saves.length > 0 && (
        <div className="section-gap">
          <h4 style={{ color: 'var(--muted-on-dark)' }}>继续游戏</h4>
          <div className="row-between" style={{ flexWrap: 'wrap' }}>
            {saves.map((s) => (
              <button key={s.slot} className="ghost" onClick={() => loadSlot(s.slot)}>
                槽位 {s.slot} · {s.storyId}
              </button>
            ))}
          </div>
        </div>
      )}

      <ImportDebugPanel errors={errors} />
    </div>
  );
}
