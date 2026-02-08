import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// Connexion au serveur
const socket = io('http://localhost:3000');

export interface Token {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  hp?: { current: number; max: number };
}

interface GameState {
  tokens: Token[];
  camera: { x: number; y: number; zoom: number };
  selection: string | null;
  gridSize: number;
  mapBackground: { url: string | null; width: number; height: number };
  
  // Actions
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  updateTokenPosition: (id: string, x: number, y: number, emit?: boolean) => void; // Ajout param 'emit'
  selectToken: (id: string | null) => void;
  setMapBackground: (url: string, width: number, height: number, emit?: boolean) => void;
  
  // Action serveur
  syncState: (serverState: any) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  
  // Écouteurs Socket.IO (Initialisation)
  socket.on('init-state', (state) => {
    set({ tokens: state.tokens, mapBackground: state.mapBackground || { url: null, width: 0, height: 0 } });
  });

  socket.on('token-moved', ({ id, x, y }) => {
    // On met à jour SANS ré-émettre l'événement (pour éviter une boucle infinie)
    get().updateTokenPosition(id, x, y, false);
  });

  socket.on('map-changed', (mapData) => {
    set({ mapBackground: mapData });
  });

  return {
    tokens: [], // On part vide, le serveur nous donnera la vérité
    camera: { x: 0, y: 0, zoom: 1 },
    selection: null,
    gridSize: 70,
    mapBackground: { url: null, width: 0, height: 0 },

    setCamera: (x, y) => set((state) => ({ camera: { ...state.camera, x, y } })),
    setZoom: (zoom) => set((state) => ({ camera: { ...state.camera, zoom } })),

    updateTokenPosition: (id, x, y, emit = true) => {
      set((state) => ({
        tokens: state.tokens.map(t => t.id === id ? { ...t, x, y } : t)
      }));
      // Si c'est nous qui bougeons, on prévient le serveur
      if (emit) {
        socket.emit('move-token', { id, x, y });
      }
    },

    selectToken: (id) => set({ selection: id }),

    setMapBackground: (url, width, height, emit = true) => {
      const mapData = { url, width, height };
      set({ mapBackground: mapData });
      if (emit) {
        socket.emit('change-map', mapData);
      }
    },

    syncState: (state) => set(state),
  };
});