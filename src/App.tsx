import { useEngineStore } from './store/useEngineStore';
import { TitleScreen } from './ui/TitleScreen';
import { PlayScreen } from './ui/PlayScreen';
import { EndingScreen } from './ui/EndingScreen';

/** 顶层屏幕：标题 / 全屏阅读 / 结局，共用夜间外壳。 */
export default function App() {
  const screen = useEngineStore((s) => s.screen);

  return (
    <div className="player">
      {screen === 'title' && <TitleScreen />}
      {screen === 'play' && <PlayScreen />}
      {screen === 'ending' && <EndingScreen />}
    </div>
  );
}
