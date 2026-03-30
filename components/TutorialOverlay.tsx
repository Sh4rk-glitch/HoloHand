
import React, { useState, useEffect } from 'react';
import { TutorialStep, ActiveTool, GestureType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Hand, MousePointer2, CheckCircle2, Info, RefreshCcw, X, Grab } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  currentAction?: string;
}

const GestureAnimation: React.FC<{ action: string }> = ({ action }) => {
  if (action === 'PINCH') {
    return (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Static Closed Hand */}
          <div className="absolute">
            <Grab size={100} className="text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]" />
          </div>
          
          {/* Static Thumb Tip */}
          <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#06b6d4] z-20" />
          
          {/* Static Index Tip */}
          <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-pink-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#ec4899] z-20" />
        </div>
      </div>
    );
  }
  if (action === 'GRAB') {
    return (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 0.8, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative"
        >
          <motion.div
            animate={{ 
              opacity: [0.2, 0, 0.2],
              scale: [1, 0.5, 1]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Hand size={120} className="text-cyan-400" />
          </motion.div>
          
          <motion.div
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Grab size={100} className="text-pink-500 shadow-[0_0_40px_#ec4899]" />
          </motion.div>

          <motion.div 
            animate={{ 
              borderRadius: ["20%", "50%", "20%"],
              scale: [1, 0.6, 1],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border-4 border-pink-500 shadow-[0_0_40px_#ec4899]"
          />
        </motion.div>
      </div>
    );
  }
  if (action === 'SELECT_TOOL') {
    return (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-dashed border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
        <motion.div 
          initial={{ x: -100, y: 100 }}
          animate={{ x: 0, y: 0 }}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
          className="relative"
        >
          <MousePointer2 size={64} className="text-white shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
            className="absolute top-0 left-0 w-12 h-12 border-2 border-pink-500 rounded-full -translate-x-1/2 -translate-y-1/2"
          />
        </motion.div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
           <div className="w-12 h-12 bg-cyan-500/20" />
        </div>
      </div>
    );
  }
  return null;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to HoloHand',
    description: 'Experience the future of spatial computing. You can control this interface with your hands or your mouse.',
    actionRequired: 'NONE'
  },
  {
    id: 'pinch',
    title: 'The Pinch Gesture',
    description: 'Pinch your thumb and index finger together (or click and hold with mouse) to DRAW or SELECT tools.',
    actionRequired: 'PINCH'
  },
  {
    id: 'grab',
    title: 'The Grab Gesture',
    description: 'Close your hand into a fist (or use Shift + Click with mouse) to GRAB and MOVE holographic entities.',
    actionRequired: 'GRAB'
  },
  {
    id: 'tools',
    title: 'Radial Menu',
    description: 'Hover over the icons on the right to switch tools. Try selecting the SHAPE tool.',
    actionRequired: 'SELECT_TOOL'
  },
  {
    id: 'finish',
    title: 'System Calibrated',
    description: 'You are ready. Use the "M" key to toggle the menu, or explore the various creation tools.',
    actionRequired: 'NONE'
  }
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = TUTORIAL_STEPS[stepIndex];

  if (!currentStep) return null;

  const handleNext = () => {
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 md:p-8 font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-5xl flex flex-col items-center text-center pointer-events-auto"
        >
          <div className="flex flex-col items-center mb-6 md:mb-12">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.6em] text-cyan-400 mb-4 md:mb-6 font-bold">System Manual {stepIndex + 1}/{TUTORIAL_STEPS.length}</span>
            <h2 className="text-4xl md:text-9xl font-black tracking-tighter uppercase leading-[0.82] text-white italic font-serif">
              {currentStep.title}
            </h2>
          </div>

          <p className="text-sm md:text-2xl text-cyan-100/70 max-w-3xl mb-8 md:mb-16 leading-relaxed font-light">
            {currentStep.description}
          </p>

          <div className="flex flex-col items-center gap-4 md:gap-8">
            <div className="scale-75 md:scale-100">
              <GestureAnimation action={currentStep.actionRequired} />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mt-4 md:mt-8">
              <button
                onClick={handleSkip}
                className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4 border border-white/20 text-white/40 font-bold uppercase tracking-widest text-[10px] md:text-xs hover:text-white hover:border-white transition-all"
              >
                Skip All
              </button>
              
              <button
                onClick={handleNext}
                className="group relative w-full md:w-auto px-10 py-4 md:px-16 md:py-6 bg-white text-black font-black uppercase tracking-tighter italic text-lg md:text-xl hover:bg-cyan-400 transition-colors"
              >
                <span className="relative z-10">
                  {stepIndex === TUTORIAL_STEPS.length - 1 ? 'Begin Operation' : 'Next Protocol'}
                </span>
                <div className="absolute inset-0 bg-cyan-400 translate-x-1.5 translate-y-1.5 -z-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"></div>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-5 select-none">
        <div className="absolute top-0 left-0 text-[25vw] font-black text-white/5 leading-none -translate-x-1/4 -translate-y-1/4 uppercase italic font-serif">
          {currentStep.title}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
