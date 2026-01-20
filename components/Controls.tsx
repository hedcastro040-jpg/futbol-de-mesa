
import React, { useRef, useState } from 'react';
import { MoveVertical, Zap } from 'lucide-react';

interface ControlsProps {
  onKickDefense: () => void;
  onKickAttack: () => void;
  onMoveDefense: (y: number | null) => void;
  onMoveAttack: (y: number | null) => void;
  visible?: boolean;
}

const MovementSlider: React.FC<{
  onMove: (y: number | null) => void;
  colorClass: string;
  activeColorClass: string;
}> = ({ onMove, colorClass, activeColorClass }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [touchIndicatorY, setTouchIndicatorY] = useState<number | null>(null);

  const calculatePosition = (clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / rect.height;
    const normalized = Math.max(-1, Math.min(1, (relativeY * 2) - 1));
    onMove(normalized);
    setTouchIndicatorY(clientY - rect.top);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsActive(true);
    calculatePosition(e.clientY);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive) return;
    e.preventDefault();
    calculatePosition(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isActive) return;
    e.preventDefault();
    setIsActive(false);
    onMove(null);
    setTouchIndicatorY(null);
  };

  return (
    <div
      ref={ref}
      className={`h-36 w-full rounded-2xl transition-all shadow-xl flex flex-col items-center justify-center relative touch-none cursor-ns-resize overflow-hidden border-b-4 ${isActive ? 'translate-y-1 border-b-2 ' + activeColorClass : colorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isActive && touchIndicatorY !== null && (
        <div
          className="absolute left-0 right-0 h-1.5 bg-white/50 rounded-full pointer-events-none"
          style={{ top: `${touchIndicatorY}px`, transform: 'translateY(-50%)' }}
        />
      )}
      <MoveVertical className="w-10 h-10 text-white/70 pointer-events-none" />
    </div>
  );
};

const KickButton: React.FC<{
  onKick: () => void;
  label: string;
  colorClass: string;
  activeColorClass: string;
}> = ({ onKick, label, colorClass, activeColorClass }) => {
  const [isActive, setIsActive] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsActive(true);
    onKick();
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsActive(false);
  };

  return (
    <div
      className={`h-36 w-full rounded-2xl text-white font-bold text-lg transition-all shadow-xl flex flex-col items-center justify-center relative touch-none cursor-pointer overflow-hidden border-b-8 select-none ${isActive ? 'translate-y-2 border-b-0 ' + activeColorClass : colorClass}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="relative z-10 flex flex-col items-center pointer-events-none opacity-90 text-center">
        <Zap className="w-8 h-8 text-white/70" />
        <span className="text-xl tracking-widest my-1 font-display">{label}</span>
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({
  onKickDefense,
  onKickAttack,
  onMoveDefense,
  onMoveAttack,
  visible = true
}) => {
  if (!visible) return null;

  return (
    <div className="flex justify-between w-full max-w-[800px] mt-4 px-2 gap-4 touch-none select-none animate-slide-up">
      {/* Defense Controls (Left) */}
      <div className="w-[49%] flex gap-3">
        <div className="w-[40%]">
          <MovementSlider
            onMove={onMoveDefense}
            colorClass="bg-slate-700 border-slate-900"
            activeColorClass="bg-slate-600 border-slate-800"
          />
        </div>
        <div className="w-[60%]">
          <KickButton
            label="DEFENSA"
            colorClass="bg-blue-600 border-blue-800"
            activeColorClass="bg-blue-500 border-blue-700"
            onKick={onKickDefense}
          />
        </div>
      </div>

      {/* Attack Controls (Right) */}
      <div className="w-[49%] flex gap-3">
        <div className="w-[60%]">
          <KickButton
            label="ATAQUE"
            colorClass="bg-indigo-600 border-indigo-800"
            activeColorClass="bg-indigo-500 border-indigo-700"
            onKick={onKickAttack}
          />
        </div>
        <div className="w-[40%]">
          <MovementSlider
            onMove={onMoveAttack}
            colorClass="bg-slate-700 border-slate-900"
            activeColorClass="bg-slate-600 border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
