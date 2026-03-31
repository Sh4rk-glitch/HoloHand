
import React, { useEffect, useRef } from 'react';
import { HandState } from '../types';
import { detectGesture } from '../services/gestureDetection';

declare var Hands: any;
declare var Camera: any;
declare var drawConnectors: any;
declare var drawLandmarks: any;
declare var HAND_CONNECTIONS: any;

interface HandTrackerProps {
  onHandUpdate: (hands: HandState[]) => void;
  onLatencyUpdate: (latency: number) => void;
  onResolutionUpdate?: (width: number, height: number) => void;
  isLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  isBlurred?: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, onLatencyUpdate, onResolutionUpdate, isLoading, onError, isBlurred = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastHandsRef = useRef<HandState[]>([]);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const loadScripts = async () => {
      const version = '0.4.1646424915';
      const scripts = [
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${version}/hands.js`,
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
      ];

      try {
        for (const src of scripts) {
          if (!document.querySelector(`script[src="${src}"]`)) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = src;
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
        }
        initMediaPipe(version);
      } catch (err) {
        onError("Vision module sync failed.");
      }
    };

    const initMediaPipe = (version: string) => {
      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${version}/${file}`
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
        useCpuInference: false
      });

      let isLoaded = false;
      hands.onResults((results: any) => {
        if (!isLoaded && videoRef.current) {
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          onResolutionUpdate?.(videoRef.current.videoWidth, videoRef.current.videoHeight);
          isLoading(false);
          isLoaded = true;
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { alpha: true });
        if (!ctx || !canvas) return;

        // Use a faster clear method
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentHands: HandState[] = [];

        if (results.multiHandLandmarks) {
          // Set common styles once
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            // Swap handedness because the video is mirrored (selfie mode)
            const rawHandedness = results.multiHandedness[i].label;
            const handedness = (rawHandedness === 'Left' ? 'Right' : 'Left') as 'Left' | 'Right';
            
            const { gesture, pinchStrength, pinchPoint, raisedFingers } = detectGesture(landmarks);
            
            const prevHand = lastHandsRef.current.find(h => h.handedness === handedness);
            const velocity = prevHand ? {
              x: pinchPoint.x - prevHand.pinchPoint.x,
              y: pinchPoint.y - prevHand.pinchPoint.y
            } : { x: 0, y: 0 };

            currentHands.push({
              landmarks,
              handedness,
              gesture,
              pinchStrength,
              isPinching: gesture === 'PINCH',
              isGrabbing: gesture === 'GRAB',
              raisedFingers,
              pinchPoint,
              velocity
            });

            // Optimized drawing
            const isPinching = gesture === 'PINCH';
            const color = isPinching ? '#ec4899' : '#06b6d4';
            const landmarkColor = isPinching ? '#fff' : '#22d3ee';

            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color,
              lineWidth: 3
            });
            drawLandmarks(ctx, landmarks, {
              color: landmarkColor,
              lineWidth: 1,
              radius: (data: any) => data.from ? 1.5 : 4
            });
          }
        }

        lastHandsRef.current = currentHands;
        
        // Higher frame rate: throttle state updates to ~60fps+ (was ~30fps)
        const now = Date.now();
        if (now - lastUpdateRef.current > 10) {
          onHandUpdate(currentHands);
          lastUpdateRef.current = now;
        }
      });

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              const frameStart = performance.now();
              try {
                await hands.send({ image: videoRef.current });
                const latency = performance.now() - frameStart;
                // Throttle latency updates to avoid re-rendering App too often
                if (Math.random() < 0.1) {
                  onLatencyUpdate(latency);
                }
              } catch (e) {}
            }
          },
          width: 1280,
          height: 720
        });

        // Explicitly request camera permission to trigger browser prompt
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
            camera.start().catch((err: any) => {
              console.error("Camera start error:", err);
              onError("Vision sensor initialization failed. Please check if another app is using the camera.");
            });
          })
          .catch((err: any) => {
            console.error("Camera permission error:", err);
            if (err.name === 'NotAllowedError') {
              onError("Camera access denied. Please click the camera icon in your address bar to allow access.");
            } else {
              onError(`Failed to acquire camera feed: ${err.message}`);
            }
          });
      }
    };

    loadScripts();
  }, [onHandUpdate, isLoading, onError]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0 scale-x-[-1]"
        playsInline
        style={{ 
          filter: isBlurred ? 'blur(20px) brightness(0.5)' : 'none'
        }}
      />
      {/* Raw skeleton z-index to be behind HUD but above video */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-10 pointer-events-none scale-x-[-1]"
        width={1280}
        height={720}
      />
    </div>
  );
};

export default HandTracker;
