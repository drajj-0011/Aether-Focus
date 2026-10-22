import { useEffect, useRef } from 'react';

interface AuraCanvasProps {
  active: boolean;
  energy: number;
}

export function AuraCanvas({ active, energy }: AuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0;
    let animation = 0;
    let width = 0;
    let height = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = Array.from({ length: 42 }, (_, index) => ({
      angle: (index / 42) * Math.PI * 2,
      radius: 0.28 + ((index * 17) % 29) / 100,
      size: 0.6 + (index % 4) * 0.35,
      speed: 0.00008 + (index % 7) * 0.000012,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const cx = width / 2 + pointer.current.x * 9;
      const cy = height / 2 + pointer.current.y * 7;
      const min = Math.min(width, height);
      const pulse = reducedMotion ? 0 : Math.sin(time * 0.0007) * (active ? 7 : 3);

      const halo = context.createRadialGradient(cx, cy, 10, cx, cy, min * 0.47 + pulse);
      halo.addColorStop(0, active ? 'rgba(223,255,116,0.16)' : 'rgba(184,166,255,0.10)');
      halo.addColorStop(0.55, 'rgba(152,132,255,0.055)');
      halo.addColorStop(1, 'rgba(16,17,15,0)');
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        const movement = reducedMotion ? 0 : time * particle.speed * (active ? 2.2 : 0.65);
        const angle = particle.angle + movement;
        const orbit = min * particle.radius * 0.62 + pulse;
        const flatten = 0.72 + (index % 3) * 0.08;
        const x = cx + Math.cos(angle) * orbit;
        const y = cy + Math.sin(angle) * orbit * flatten;
        const alpha = 0.16 + ((index + energy) % 5) * 0.075;
        context.beginPath();
        context.fillStyle = index % 4 === 0 ? `rgba(223,255,116,${alpha})` : `rgba(213,205,255,${alpha})`;
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      frame += 1;
      if (!reducedMotion || frame < 2) animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [active, energy]);

  return (
    <canvas
      ref={canvasRef}
      className="aura-canvas"
      aria-hidden="true"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        };
      }}
      onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}
    />
  );
}
