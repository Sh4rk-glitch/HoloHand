
import React, { useState, useCallback, useEffect } from 'react';
import HandTracker from './components/HandTracker';
import HologramScene from './components/HologramScene';
import HUD from './components/HUD';
import TutorialOverlay from './components/TutorialOverlay';
import { HandState } from './types';
import { Loader2, ShieldAlert, RefreshCcw, Hand } from 'lucide-react';

const App: React.FC = () => {
  const [hands, setHands] = useState<HandState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | undefined>();
  const [latency, setLatency] = useState(0);
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('holo_tutorial_seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleHandUpdate = useCallback((newHands: HandState[]) => {
    setHands(newHands);
  }, []);

  const handleLatencyUpdate = useCallback((l: number) => {
    setLatency(l);
  }, []);

  const handleResolutionUpdate = useCallback((w: number, h: number) => {
    setResolution({ width: w, height: h });
  }, []);

  const toggleBlur = useCallback(() => {
    setIsBlurred(prev => !prev);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('holo_tutorial_seen', 'true');
  };

  const actionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleAction = useCallback((action: string) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction(action);
    // Reset action after a longer delay to allow re-triggering and ensure tutorial verification
    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction(undefined);
      actionTimeoutRef.current = null;
    }, 2000);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <div className="absolute inset-0 bg-black"></div>
      
      {!error && (
        <div className="absolute inset-0 w-full h-full">
          <HandTracker 
            onHandUpdate={handleHandUpdate} 
            onLatencyUpdate={handleLatencyUpdate}
            onResolutionUpdate={handleResolutionUpdate}
            isLoading={setLoading} 
            onError={setError}
            isBlurred={isBlurred} 
          />
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] z-10"></div>

      {!error && (
        <HologramScene 
          hands={hands} 
          onToggleBlur={toggleBlur} 
          isBlurred={isBlurred} 
          onAction={handleAction}
          videoResolution={resolution}
        />
      )}
      {!error && !loading && <HUD hands={hands} latency={latency} />}

      {showTutorial && !loading && !error && (
        <TutorialOverlay onComplete={handleTutorialComplete} currentAction={currentAction} />
      )}

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center text-cyan-400">
          <div className="relative mb-8">
             <div className="w-24 h-24 border-2 border-cyan-400/30 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
                <Hand size={40} className="animate-pulse text-cyan-400" />
             </div>
          </div>
          <h2 className="hologram-font text-2xl tracking-[0.5em] mb-2 uppercase text-center">Core Sync...</h2>
          <p className="mt-4 text-[10px] font-mono opacity-50 uppercase tracking-widest">Calibrating Vision Matrix</p>
        </div>
      )}

      {/* Error / Permission Overlay */}
      {error && (
        <div className="absolute inset-0 z-[110] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 border-2 border-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <ShieldAlert size={40} className="text-red-500 animate-pulse" />
          </div>
          <h2 className="hologram-font text-2xl text-red-500 tracking-[0.2em] uppercase mb-4">Neural Link Severed</h2>
          <p className="text-white/60 font-mono text-[12px] max-w-md mb-8 leading-relaxed uppercase">
            {error}
            <br />
            Please enable camera permissions in your browser to project the holographic interface.
          </p>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/50 px-8 py-3 rounded-full text-red-400 hologram-font text-sm hover:bg-red-500/20 transition-all uppercase tracking-widest"
          >
            <RefreshCcw size={16} />
            Reconnect Link
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-28 right-4 md:bottom-36 md:right-8 z-[60] pointer-events-none">
          <div className="pointer-events-auto">
            <button 
              onClick={() => {
                localStorage.removeItem('holo_tutorial_seen');
                setShowTutorial(true);
              }}
              className="bg-black/40 border-2 border-cyan-500 px-4 py-2 text-cyan-400 font-mono text-[10px] hover:bg-cyan-500/20 transition-all uppercase tracking-[0.2em] font-bold glow-cyan glitch-hover"
            >
              Reset Tutorial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
