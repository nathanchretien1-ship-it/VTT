import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      {/* Interface utilisateur par-dessus la carte */}
      <div className="absolute top-4 left-4 z-10 p-4 bg-slate-800/80 rounded-lg shadow-xl">
        <h1 className="text-xl font-bold">Mon VTT - Alpha</h1>
        <p className="text-sm text-slate-400">Mode : Construction</p>
      </div>

      {/* La Table de Jeu */}
      <GameCanvas />
    </div>
  );
}

export default App;