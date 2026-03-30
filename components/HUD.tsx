
import React from 'react';
import { HandState } from '../types';
import { Crosshair, Zap, Activity, MousePointer2, Layers, Cpu, Radio } from 'lucide-react';

interface HUDProps {
  hands: HandState[];
  latency: number;
}

const HUD: React.FC<HUDProps> = ({ hands, latency }) => {
  const primaryHand = hands[0];
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="absolute inset-0 p-4 md:p-8 z-40 pointer-events-none flex flex-col justify-between text-cyan-400 overflow-hidden font-mono">
      {/* Top Bar - Grid Style */}
      <div className="flex justify-between items-start border-b border-cyan-500/30 pb-2 md:pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 md:gap-4">
            <div className={`w-8 h-8 md:w-10 md:h-10 border ${hands.length > 0 ? 'border-pink-500 bg-pink-500/10' : 'border-cyan-500 bg-cyan-500/10'} flex items-center justify-center transition-all duration-500`}>
              <Crosshair size={isMobile ? 14 : 18} className={hands.length > 0 ? 'text-pink-400' : 'text-cyan-400'} />
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold tracking-tighter uppercase leading-none italic font-serif">HoloHand v4.7</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[6px] md:text-[7px] bg-cyan-500 text-black px-1 font-bold italic">STABLE</span>
                {!isMobile && <p className="text-[8px] opacity-50 tracking-widest uppercase">Holo_SCAN: {hands.length > 0 ? 'LOCKED' : 'SEARCHING'}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-cyan-500/20 border border-cyan-500/20">
          <div className="bg-black/60 p-1 md:p-2 flex flex-col items-end min-w-[50px] md:min-w-[80px]">
            <span className="text-[5px] md:text-[7px] opacity-40 uppercase">LAT</span>
            <span className="text-[9px] md:text-[11px] font-bold">{latency.toFixed(0)}ms</span>
          </div>
          <div className="bg-black/60 p-1 md:p-2 flex flex-col items-end min-w-[50px] md:min-w-[80px]">
            <span className="text-[5px] md:text-[7px] opacity-40 uppercase">LINK</span>
            <span className="text-[9px] md:text-[11px] font-bold text-pink-400">{hands.length}</span>
          </div>
        </div>
      </div>

      {/* Side Decorative Data - Technical Grid (Hidden on Mobile) */}
      {!isMobile && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-8">
          <div className="flex flex-col border-l border-cyan-500/20">
            {[
              { label: 'X_COORD', val: primaryHand?.pinchPoint.x.toFixed(4) || '0.0000' },
              { label: 'Y_COORD', val: primaryHand?.pinchPoint.y.toFixed(4) || '0.0000' },
              { label: 'Z_DEPTH', val: primaryHand?.pinchPoint.z.toFixed(4) || '0.0000' },
              { label: 'VEL_VEC', val: primaryHand ? `${primaryHand.velocity.x.toFixed(2)},${primaryHand.velocity.y.toFixed(2)}` : '0.00,0.00' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col p-2 border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                <span className="text-[6px] opacity-40 uppercase tracking-[0.2em] italic font-serif">{item.label}</span>
                <span className="text-[9px] tracking-tight">{item.val}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-l-2 border-cyan-400 pl-3">
            <span className="text-xs font-bold tracking-[0.2em] text-white italic">MOUSE</span>
            <span className="text-[8px] opacity-60">G_MODE: {primaryHand?.handedness === 'Mouse' ? primaryHand.gesture : 'NONE'}</span>
          </div>
        </div>
      )}

      {/* Bottom Interface - Grid Layout */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-px bg-cyan-500/20 border border-cyan-500/20 mt-auto mb-16 md:mb-0`}>
        <div className="bg-black/60 p-2 md:p-4 flex flex-col gap-1">
          <span className="text-[6px] md:text-[7px] uppercase opacity-40 tracking-[0.4em] font-bold italic font-serif">Core_Dynamics</span>
          <div className="flex items-center gap-2">
            <Cpu size={isMobile ? 10 : 14} className="text-cyan-400" />
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest">
              {hands.length > 1 ? 'MULTI' : hands.length === 1 ? 'SYNC' : 'VOID'}
            </span>
          </div>
        </div>
        
        <div className="bg-black/60 p-2 md:p-4 flex flex-col gap-1 border-l border-cyan-500/20">
          <span className="text-[6px] md:text-[7px] uppercase opacity-40 tracking-[0.4em] font-bold italic font-serif">Neural_State</span>
          <span className="text-[8px] md:text-[10px] text-pink-400 font-bold uppercase">
            {primaryHand?.gesture || 'NO_SIGNAL'}
          </span>
        </div>

        {!isMobile && (
          <div className="bg-black/60 p-4 flex flex-col items-end justify-center border-l border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.1em] font-bold">HoloHand Version 4.7</span>
              <div className="w-2 h-2 bg-cyan-900 border border-cyan-500/30"></div>
            </div>
            <p className="text-[6px] opacity-30 uppercase tracking-[0.3em] mt-1">Vision_Matrix: ACTIVE</p>
          </div>
        )}
      </div>

      {/* Dynamic Background Noise Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[length:40px_40px]"></div>
      </div>
    </div>
  );
};

export default HUD;
