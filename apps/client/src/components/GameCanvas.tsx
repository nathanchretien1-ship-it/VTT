import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Accès aux actions du store
  const { 
    setCamera, setZoom, updateTokenPosition, selectToken, setMapBackground 
  } = useGameStore();

  // État local pour l'image (seul useState autorisé)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // --- REFS MUTABLES (Le cœur du système) ---
  // On n'utilise PAS useState pour éviter les re-rendus pendant le drag
  const stateRef = useRef({
    isPanning: false,
    isDraggingToken: null as string | null,
    startX: 0,
    startY: 0,
    startCamX: 0,
    startCamY: 0,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Chargement Image
  const mapUrl = useGameStore(s => s.mapBackground.url);
  useEffect(() => {
    if (mapUrl) {
      const img = new Image();
      img.src = mapUrl;
      img.onload = () => setMapImage(img);
    }
  }, [mapUrl]);

  // =========================================================================
  // 1. GESTION DES ÉVÉNEMENTS NATIFS (Le "Fix" Radical)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fonction utilitaire pour coordonnées
    const getLocalCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const { camera } = useGameStore.getState();
      const x = (e.clientX - rect.left - camera.x) / camera.zoom;
      const y = (e.clientY - rect.top - camera.y) / camera.zoom;
      return { x, y, clientX: e.clientX, clientY: e.clientY };
    };

    const onMouseDown = (e: MouseEvent) => {
      const { camera, tokens, gridSize } = useGameStore.getState();
      const coords = getLocalCoords(e);
      
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.startCamX = camera.x;
      stateRef.current.startCamY = camera.y;

      // Clic Droit ou Molette = PAN
      if (e.button === 1 || e.button === 2) {
        stateRef.current.isPanning = true;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }

      // Clic Gauche = Token ou Pan
      if (e.button === 0) {
        const clickedToken = tokens.find(t => {
          const tx = t.x * gridSize;
          const ty = t.y * gridSize;
          const ts = t.size * gridSize;
          return coords.x >= tx && coords.x <= tx + ts && coords.y >= ty && coords.y <= ty + ts;
        });

        if (clickedToken) {
          selectToken(clickedToken.id);
          stateRef.current.isDraggingToken = clickedToken.id;
        } else {
          selectToken(null);
          stateRef.current.isPanning = true; // Drag le fond
          canvas.style.cursor = 'grabbing';
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      stateRef.current.lastMouseX = e.clientX; // Pour le debug
      stateRef.current.lastMouseY = e.clientY;

      if (stateRef.current.isPanning) {
        // CALCUL ABSOLU : Position actuelle - Position Départ
        const dx = e.clientX - stateRef.current.startX;
        const dy = e.clientY - stateRef.current.startY;
        
        // On applique directement sans accumulation
        setCamera(
          stateRef.current.startCamX + dx,
          stateRef.current.startCamY + dy
        );
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (stateRef.current.isPanning) {
        stateRef.current.isPanning = false;
        canvas.style.cursor = 'grab';
      }

      if (stateRef.current.isDraggingToken) {
        const { gridSize } = useGameStore.getState();
        const coords = getLocalCoords(e);
        const gx = Math.floor(coords.x / gridSize);
        const gy = Math.floor(coords.y / gridSize);
        
        updateTokenPosition(stateRef.current.isDraggingToken, gx, gy);
        stateRef.current.isDraggingToken = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { camera } = useGameStore.getState();
      const zoomSpeed = 0.001;
      const newZoom = Math.min(Math.max(camera.zoom * (1 - e.deltaY * zoomSpeed), 0.1), 5);
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const mouseWorldX = (mouseX - camera.x) / camera.zoom;
      const mouseWorldY = (mouseY - camera.y) / camera.zoom;

      const newX = mouseX - mouseWorldX * newZoom;
      const newY = mouseY - mouseWorldY * newZoom;

      setCamera(newX, newY);
      setZoom(newZoom);
    };

    // Attachement des écouteurs "Vrais" (Pas React)
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove); // Window pour ne pas perdre le drag
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      // Nettoyage impératif
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []); // [] vide = S'exécute UNE SEULE FOIS au chargement.

  // =========================================================================
  // 2. BOUCLE DE RENDU (Le Dessinateur)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
        if(containerRef.current) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;
        }
    });
    if(containerRef.current) resizeObserver.observe(containerRef.current);

    let frameId: number;

    const render = () => {
      // On lit le store directement (Zéro latence)
      const { camera, tokens, gridSize, mapBackground, selection } = useGameStore.getState();

      // Reset
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Map
      if (mapImage) {
        ctx.drawImage(mapImage, 0, 0, mapBackground.width, mapBackground.height);
      }

      // Grille
      if (camera.zoom > 0.2) {
        const startX = Math.floor((-camera.x / camera.zoom) / gridSize) * gridSize - gridSize;
        const startY = Math.floor((-camera.y / camera.zoom) / gridSize) * gridSize - gridSize;
        const endX = startX + (canvas.width / camera.zoom) + 2 * gridSize;
        const endY = startY + (canvas.height / camera.zoom) + 2 * gridSize;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY); ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y); ctx.lineTo(endX, y);
        }
        ctx.stroke();
      }

      // Tokens
      tokens.forEach(t => {
        const x = t.x * gridSize;
        const y = t.y * gridSize;
        const s = t.size * gridSize;
        
        ctx.shadowBlur = 10; ctx.shadowColor = 'black';
        ctx.beginPath();
        ctx.arc(x + s/2, y + s/2, s*0.4, 0, Math.PI*2);
        ctx.fillStyle = t.color;
        ctx.fill();
        
        if (selection === t.id) {
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3/camera.zoom; ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      // --- DEBUG OVERLAY (Texte Rouge en haut à gauche) ---
      // Si ça bugge, lis-moi ces valeurs !
      ctx.fillStyle = 'red';
      ctx.font = '14px monospace';
      ctx.fillText(`MODE: ${stateRef.current.isPanning ? 'PANNING' : 'IDLE'}`, 10, 20);
      ctx.fillText(`CAM X: ${Math.round(camera.x)}`, 10, 40);
      ctx.fillText(`MOUSE X: ${stateRef.current.lastMouseX}`, 10, 60);

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [mapImage]); // Dépendance minimale

  // Drag & Drop (Gardé simple)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => setMapBackground(evt.target?.result as string, img.width, img.height);
            img.src = evt.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="block w-full h-full cursor-grab"
      />
      {!useGameStore(s => s.mapBackground.url) && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500 pointer-events-none">
            Glisse une image ici
        </div>
      )}
    </div>
  );
};

export default GameCanvas;