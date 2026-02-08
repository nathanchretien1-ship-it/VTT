import GameCanvas from './components/GameCanvas';
import InterfaceUI from './components/InterfaceUI';

function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Le monde du jeu (Canvas) */}
      <GameCanvas />
      
      {/* 2. L'Interface (HUD) */}
      <InterfaceUI />
    </div>
  );
}

export default App;