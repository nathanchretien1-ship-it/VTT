import { useGameStore } from '../store/gameStore';
import { MousePointer2, Move, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';

export default function InterfaceUI() {
  const { selection, tokens, camera } = useGameStore();
  
  const selectedToken = tokens.find(t => t.id === selection);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* HEADER: Infos système */}
      <div className="absolute top-4 left-4 bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 pointer-events-auto shadow-xl backdrop-blur-sm">
        <h1 className="font-bold text-lg text-indigo-400">ARCANE VTT</h1>
        <div className="text-xs text-slate-400 mt-1 flex gap-3 font-mono">
            <span>ZOOM: {Math.round(camera.zoom * 100)}%</span>
            <span>POS: {Math.round(camera.x)},{Math.round(camera.y)}</span>
        </div>
      </div>

      {/* FOOTER: Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700 flex gap-2 shadow-2xl backdrop-blur-sm">
            <button className="p-3 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors" title="Select">
                <MousePointer2 size={20} />
            </button>
            <button className="p-3 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors" title="Pan">
                <Move size={20} />
            </button>
            <div className="w-px bg-slate-700 mx-1"></div>
            {/* <button 
                onClick={() => zoomCamera(-100, window.innerWidth/2, window.innerHeight/2)}
                className="p-3 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors">
                <ZoomIn size={20} />
            </button>
            <button 
                 onClick={() => zoomCamera(100, window.innerWidth/2, window.innerHeight/2)}
                className="p-3 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors">
                <ZoomOut size={20} />
            </button> */}
        </div>
      </div>

      {/* SIDEBAR: Fiche token sélectionné */}
      {selectedToken && (
        <div className="absolute top-4 right-4 w-72 bg-slate-900/95 text-white p-4 rounded-lg border border-slate-700 pointer-events-auto shadow-2xl animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center gap-3 mb-4">
                <div 
                    className="w-12 h-12 rounded-full border-2 border-white shadow-lg" 
                    style={{ backgroundColor: selectedToken.color }}
                ></div>
                <div>
                    <h2 className="font-bold text-lg">{selectedToken.name}</h2>
                    <p className="text-xs text-slate-400 font-mono">ID: {selectedToken.id}</p>
                </div>
            </div>
            
            {/* Gestion des PV (Seulement si le token a des HP) */}
            {selectedToken.hp && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1 text-slate-300">
                        <span>Points de Vie</span>
                        <span className="font-bold">{selectedToken.hp.current} / {selectedToken.hp.max}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" 
                            style={{ width: `${(selectedToken.hp.current / selectedToken.hp.max) * 100}%`}}
                        ></div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800">
                <button className="bg-slate-800 hover:bg-slate-700 py-2 rounded text-sm border border-slate-600 transition-colors">
                    Éditer
                </button>
                <button className="bg-red-900/30 hover:bg-red-900/50 text-red-200 py-2 rounded text-sm border border-red-900/50 transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Supprimer
                </button>
            </div>
        </div>
      )}
    </div>
  );
}