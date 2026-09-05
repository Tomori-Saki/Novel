import { useEngineStore } from './store/useEngineStore';
import { TitleScreen } from './ui/TitleScreen';
import { PlayScreen } from './ui/PlayScreen';
import { EndingScreen } from './ui/EndingScreen';

/** 顶层屏幕状态机：标题 / 全屏阅读 / 结局。 */
export default function App() {
  const screen = useEngineStore((s) => s.screen);

  // 阅读态占满整个屏幕，不套边框舞台
  if (screen === 'play') return <PlayScreen />;

  return (
    <div className="app">
      <div className="stage">
        {screen === 'title' && <TitleScreen />}
        {screen === 'ending' && <EndingScreen />}
      </div>
    </div>
  );
}
