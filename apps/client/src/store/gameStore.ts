import { create } from 'zustand';

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
  mapBackground: { url: string | null; width: number; height: number; offsetX: number; offsetY: number };

  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  addToken: (token: Token) => void;
  updateTokenPosition: (id: string, x: number, y: number) => void;
  selectToken: (id: string | null) => void;
  setMapBackground: (url: string, width: number, height: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  tokens: [
    { id: 't1', name: 'Guerrier', x: 2, y: 2, size: 1, color: '#ef4444', hp: { current: 10, max: 15 } },
  ],
  camera: { x: 0, y: 0, zoom: 1 },
  selection: null,
  gridSize: 70,
  mapBackground: { url: null, width: 0, height: 0, offsetX: 0, offsetY: 0 },

  setCamera: (x, y) => set((state) => ({ camera: { ...state.camera, x, y } })),
  setZoom: (zoom) => set((state) => ({ camera: { ...state.camera, zoom } })),
  addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
  updateTokenPosition: (id, x, y) => set((state) => ({
    tokens: state.tokens.map(t => t.id === id ? { ...t, x, y } : t)
  })),
  selectToken: (id) => set({ selection: id }),
  setMapBackground: (url, width, height) => set({ 
    mapBackground: { url, width, height, offsetX: 0, offsetY: 0 } 
  }),
}));