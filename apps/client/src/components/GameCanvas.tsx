import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // On récupère uniquement les setters pour éviter les re-rendus
  const { 
    setCamera, setZoom, updateTokenPosition, selectToken, setMapBackground 
  } = useGameStore();

  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // --- VARIABLES DE DRAG (Stockées hors de React) ---
  const dragRef = useRef({
    isPanning: false,
    isDraggingToken: null as string | null,
    startX: 0,      // Position souris au début du clic
    startY: 0,
    startCamX: 0,   // Position caméra au début du clic (FIXE)
    startCamY: 0,
    debugMsg: "Prêt" // Pour afficher à l'écran
  });

  // Chargement de l'image
  const mapUrl = useGameStore(s => s.mapBackground.url);
  useEffect(() => {
    if (mapUrl) {
      const img = new Image();
      img.src = mapUrl;
      img.onload = () => setMapImage(img);
    }
  }, [mapUrl]);

  // =========================================================================
  // 1. GESTION DES ÉVÉNEMENTS (LOGIQUE ABSOLUE)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convertit l'écran en coordonnées du monde
    const getLocalCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { camera } = useGameStore.getState(); // Lecture directe sans dépendance
      return {
        x: (clientX - rect.left - camera.x) / camera.zoom,
        y: (clientY - rect.top - camera.y) / camera.zoom
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault(); // Empêche le navigateur de sélectionner du texte
      
      const { camera, tokens, gridSize } = useGameStore.getState();
      
      // 1. ON SAUVEGARDE L'ÉTAT INITIAL (Le point d'ancrage)
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.startCamX = camera.x;
      dragRef.current.startCamY = camera.y;
      
      // Est-ce qu'on clique sur un token ?
      const coords = getLocalCoords(e.clientX, e.clientY);
      const clickedToken = tokens.find(t => {
        const tx = t.x * gridSize;
        const ty = t.y * gridSize;
        const ts = t.size * gridSize;
        return coords.x >= tx && coords.x <= tx + ts && coords.y >= ty && coords.y <= ty + ts;
      });

      if (e.button === 0 && clickedToken) {
        // Clic Gauche sur Token
        selectToken(clickedToken.id);
        dragRef.current.isDraggingToken = clickedToken.id;
        dragRef.current.debugMsg = `Token ${clickedToken.name}`;
      } else {
        // Clic Droit ou Vide -> PAN
        dragRef.current.isPanning = true;
        dragRef.current.debugMsg = "Panning (Ancré)";
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isPanning) {
        // --- CŒUR DU CORRECTIF ---
        // On calcule la distance parcourue par la souris depuis le CLIC
        const totalDeltaX = e.clientX - dragRef.current.startX;
        const totalDeltaY = e.clientY - dragRef.current.startY;

        // On applique cette distance au point de départ FIXE
        // Aucune boucle infinie possible ici car startCamX ne change jamais pendant le drag
        setCamera(
          dragRef.current.startCamX + totalDeltaX,
          dragRef.current.startCamY + totalDeltaY
        );
        
        dragRef.current.debugMsg = `Delta: ${totalDeltaX}, ${totalDeltaY}`;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragRef.current.isPanning) {
        dragRef.current.isPanning = false;
        canvas.style.cursor = 'grab';
        dragRef.current.debugMsg = "Relâché";
      }

      if (dragRef.current.isDraggingToken) {
        const { gridSize } = useGameStore.getState();
        const coords = getLocalCoords(e.clientX, e.clientY);
        const gx = Math.floor(coords.x / gridSize);
        const gy = Math.floor(coords.y / gridSize);
        updateTokenPosition(dragRef.current.isDraggingToken, gx, gy);
        dragRef.current.isDraggingToken = null;
        dragRef.current.debugMsg = `Token Placé en ${gx}, ${gy}`;
      }
    };

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const { camera } = useGameStore.getState();
        const zoomSpeed = 0.001;
        const newZoom = Math.min(Math.max(camera.zoom * (1 - e.deltaY * zoomSpeed), 0.1), 5);
        
        // Zoom centré sur la souris
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - camera.x) / camera.zoom;
        const worldY = (mouseY - camera.y) / camera.zoom;
        
        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        setCamera(newX, newY);
        setZoom(newZoom);
        dragRef.current.debugMsg = `Zoom: ${newZoom.toFixed(2)}`;
    };

    // Attachement des écouteurs "Vrais" (Pas React) pour éviter toute latence
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove); // Window capture tout
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []); // Dépendances vides = Zéro rechargement intempestif

  // =========================================================================
  // 2. BOUCLE DE DESSIN (60 FPS)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resizeObserver = new ResizeObserver(() => {
        if(containerRef.current) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;
        }
    });
    if(containerRef.current) resizeObserver.observe(containerRef.current);

    let frameId: number;

    const render = () => {
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

      // Grille (visible si zoom suffisant)
      if (camera.zoom > 0.2) {
        const startX = Math.floor((-camera.x / camera.zoom) / gridSize) * gridSize - gridSize;
        const startY = Math.floor((-camera.y / camera.zoom) / gridSize) * gridSize - gridSize;
        const endX = startX + (canvas.width / camera.zoom) + 2 * gridSize;
        const endY = startY + (canvas.height / camera.zoom) + 2 * gridSize;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
        
        ctx.shadowBlur = 15; ctx.shadowColor = 'black';
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

      // --- DEBUG OVERLAY (Texte Rouge) ---
      // Si tu ne vois pas ça, le composant a crashé
      ctx.fillStyle = 'red';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`STATUS: ${dragRef.current.debugMsg}`, 20, 30);
      ctx.fillText(`CAMERA: ${Math.round(camera.x)}, ${Math.round(camera.y)} (z:${camera.zoom.toFixed(2)})`, 20, 50);

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [mapImage]);

  // Drag & Drop Image
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
    <div ref={containerRef} className="w-full h-full bg-black relative">
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