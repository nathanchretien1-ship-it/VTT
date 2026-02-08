import React, { useEffect, useRef } from 'react';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridSize = 50; // Taille d'une case en pixels

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajuster la taille du canvas à la fenêtre
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#334155'; // Couleur gris ardoise
      ctx.lineWidth = 1;

      // Dessiner les lignes verticales
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Dessiner les lignes horizontales
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    drawGrid();
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="bg-slate-900 w-full h-full block"
    />
  );
};

export default GameCanvas;