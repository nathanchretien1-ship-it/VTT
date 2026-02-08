import GameCanvas from './components/GameCanvas';

function App() {
  return (
    // On force un conteneur qui prend 100% de l'écran sans discussion
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <GameCanvas />
    </div>
  );
}

export default App;