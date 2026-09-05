/** 菜单面板：存档/读档 + 回退/重开/返回标题（阅读模式，无打字机语速）。 */
import { useState } from 'react';
import type { SaveMeta } from '../engine/persistence';

interface Props {
  canRewind: boolean;
  onRewind: () => void;
  onSave: (slot: string) => void;
  onLoad: (slot: string) => void;
  onRestart: () => void;
  onBack: () => void;
  listSaves: () => SaveMeta[];
}

export function SettingsPanel(p: Props) {
  const [slot, setSlot] = useState('1');
  const [saves, setSaves] = useState<SaveMeta[]>(() => p.listSaves());

  return (
    <div className="panel-inner">
      <h4>存档</h4>
      <div className="row-between">
        <span>槽位</span>
        <input style={{ width: 64 }} value={slot} onChange={(e) => setSlot(e.target.value || '1')} />
      </div>
      <div className="row-between">
        <button
          onClick={() => {
            p.onSave(slot);
            setSaves(p.listSaves());
          }}
        >
          保存
        </button>
        <button onClick={() => p.onLoad(slot)}>读取</button>
      </div>
      {saves.length > 0 && (
        <div className="empty">已有：{saves.map((s) => `${s.slot}(${s.storyId})`).join('、')}</div>
      )}

      <div className="section-gap">
        <h4>操作</h4>
        <div className="row-between">
          <button className="ghost" disabled={!p.canRewind} onClick={p.onRewind}>
            ↶ 回退一页
          </button>
          <button className="ghost" onClick={p.onRestart}>
            ⟲ 重开
          </button>
        </div>
        <button className="ghost" onClick={p.onBack}>
          ☰ 返回标题
        </button>
      </div>
    </div>
  );
}
