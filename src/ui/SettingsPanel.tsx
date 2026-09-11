/** 设置面板：外观、存档、阅读操作。大触控区域，适合手机。 */
import { useState } from 'react';
import type { SaveMeta } from '../engine/persistence';
import { ThemeSwitch } from './theme/ThemeSwitch';

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
      <h4>外观</h4>
      <ThemeSwitch />

      <div className="section-gap">
        <h4>存档</h4>
        <label className="settings-field">
          <span>槽位</span>
          <input
            className="settings-input"
            value={slot}
            onChange={(e) => setSlot(e.target.value || '1')}
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              p.onSave(slot);
              setSaves(p.listSaves());
            }}
          >
            保存
          </button>
          <button type="button" onClick={() => p.onLoad(slot)}>
            读取
          </button>
        </div>
        {saves.length > 0 && (
          <div className="empty">已有：{saves.map((s) => `${s.slot}(${s.storyId})`).join('、')}</div>
        )}
      </div>

      <div className="section-gap">
        <h4>操作</h4>
        <div className="settings-actions">
          <button type="button" className="ghost" disabled={!p.canRewind} onClick={p.onRewind}>
            回退一页
          </button>
          <button type="button" className="ghost" onClick={p.onRestart}>
            重开本章
          </button>
        </div>
        <button type="button" className="ghost settings-back" onClick={p.onBack}>
          返回标题
        </button>
      </div>
    </div>
  );
}
