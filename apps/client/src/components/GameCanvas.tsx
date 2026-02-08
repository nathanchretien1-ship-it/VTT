import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Récupération de l'état via Zustand
  const { 
    tokens, 
    camera, 
    gridSize, 
    mapBackground,
    setCamera, 
    setZoom, 
    updateTokenPosition, 
    selectToken, 
    selection 
  } = useGameStore();

  // Refs pour la gestion de la souris (évite les re-renders inutiles)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cameraStartRef = useRef({ x: 0, y: 0 });
  const selectedTokenIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);

  // Conversion Coordonnées Écran -> Monde (Grille)
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - camera.x) / camera.zoom,
      y: (screenY - camera.y) / camera.zoom
    };
  };

  // BOUCLE DE RENDU PRINCIPALE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Mise à l'échelle du canvas (DPI)
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // 2. Nettoyage
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1a1a1a'; // Couleur de fond hors map
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();

      // 3. Application de la Caméra (Pan & Zoom)
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // --- DESSIN DU JEU ---

      // A. Map Background
      if (mapBackground.url) {
        // Note: Dans une vraie implémentation, charge l'image via un objet Image() externe pour ne pas la recharger à chaque frame
        // Ici on dessine juste un placeholder ou l'image si elle était préchargée.
        // Pour ce code, on va dessiner un rectangle gris représentant la map si pas d'image chargée
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, mapBackground.width, mapBackground.height);
        
        // Si tu as l'image chargée dans un ref, tu utiliserais ctx.drawImage ici
      }

      // B. Grille
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const mapW = mapBackground.width || 2000; // Taille par défaut
      const mapH = mapBackground.height || 2000;

      ctx.beginPath();
      for (let x = 0; x <= mapW; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapH);
      }
      for (let y = 0; y <= mapH; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(mapW, y);
      }
      ctx.stroke();

      // C. Tokens
      tokens.forEach(token => {
        const x = token.x * gridSize;
        const y = token.y * gridSize;
        const size = token.size * gridSize;

        // Ombre portée
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;

        // Corps du token
        ctx.fillStyle = token.color;
        ctx.beginPath();
        // On dessine un rond au milieu de la case
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // Reset ombre

        // Sélection (cercle blanc autour)
        if (selection === token.id) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Nom du token
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(token.name, x + size / 2, y - 8);
      });

      // --- D. BROUILLARD DE GUERRE (FOG OF WAR) ---
      // On sauvegarde pour isoler l'effet de "gomme"
      ctx.save();
      
      // On dessine un rectangle noir semi-transparent sur TOUTE la map
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'; // Opacité du brouillard (0.95 = très sombre)
      ctx.fillRect(0, 0, mapW, mapH);

      // Mode "Gomme" : Ce qu'on dessine maintenant va rendre le noir transparent
      ctx.globalCompositeOperation = 'destination-out';

      tokens.forEach(token => {
        const centerX = (token.x * gridSize) + (token.size * gridSize) / 2;
        const centerY = (token.y * gridSize) + (token.size * gridSize) / 2;
        // Rayon de vision : ici 3 cases
        const visionRadius = gridSize * 3; 

        // Dégradé pour des bords de vision doux
        const gradient = ctx.createRadialGradient(
          centerX, centerY, visionRadius * 0.5, // début du dégradé (clair)
          centerX, centerY, visionRadius        // fin du dégradé (sombre)
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // En mode destination-out, alpha 1 = efface totalement
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // En mode destination-out, alpha 0 = n'efface rien

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, visionRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Restaure le mode de dessin normal
      ctx.restore();
      // ------------------------------------------

      ctx.restore(); // Fin de la caméra

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [tokens, camera, gridSize, mapBackground, selection]); // Dépendances

  // --- GESTION DES ÉVÉNEMENTS (SOURIS) ---

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY);

    // Vérifier si on clique sur un token
    // On cherche du dernier au premier (pour attraper celui du dessus)
    const clickedToken = [...tokens].reverse().find(t => {
      const tx = t.x * gridSize;
      const ty = t.y * gridSize;
      const tSize = t.size * gridSize;
      return worldPos.x >= tx && worldPos.x <= tx + tSize &&
             worldPos.y >= ty && worldPos.y <= ty + tSize;
    });

    if (e.button === 0) { // Clic gauche
      if (clickedToken) {
        selectToken(clickedToken.id);
        selectedTokenIdRef.current = clickedToken.id;
        isDraggingRef.current = true;
        // Offset pour attraper le token là où on a cliqué, pas juste par son coin haut/gauche
        dragStartRef.current = {
          x: worldPos.x - (clickedToken.x * gridSize),
          y: worldPos.y - (clickedToken.y * gridSize)
        };
      } else {
        // Clic dans le vide = Pan caméra ou désélection
        selectToken(null);
        isPanningRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        cameraStartRef.current = { ...camera };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    
    if (isDraggingRef.current && selectedTokenIdRef.current) {
      // Déplacement de Token
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = screenToWorld(mouseX, mouseY);

      // Calcul de la nouvelle position (sans aimanter à la grille tout de suite pour fluidité)
      // Ou aimanter directement :
      const rawX = worldPos.x - dragStartRef.current.x;
      const rawY = worldPos.y - dragStartRef.current.y;

      // On convertit en coordonnées grille pour le store
      const gridX = rawX / gridSize;
      const gridY = rawY / gridSize;

      updateTokenPosition(selectedTokenIdRef.current, gridX, gridY);
    } 
    else if (isPanningRef.current) {
      // Déplacement de Caméra
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setCamera(cameraStartRef.current.x + dx, cameraStartRef.current.y + dy);
    }
  };

  const handleMouseUp = () => {
    // Si on lâchait un token, on peut l'aimanter à la grille ici si on veut
    if (isDraggingRef.current && selectedTokenIdRef.current) {
      const token = tokens.find(t => t.id === selectedTokenIdRef.current);
      if (token) {
        // Aimentation simple (snap to grid)
        const snappedX = Math.round(token.x);
        const snappedY = Math.round(token.y);
        updateTokenPosition(token.id, snappedX, snappedY);
      }
    }

    isDraggingRef.current = false;
    isPanningRef.current = false;
    selectedTokenIdRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = Math.max(0.1, Math.min(5, camera.zoom - e.deltaY * 0.001));
    setZoom(newZoom);
  };

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full bg-neutral-900 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};