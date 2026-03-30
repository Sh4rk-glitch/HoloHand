
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HandState, ActiveTool, DrawingElement, ShapeType, DrawingShape, BlockElement, DrawingPath } from '../types';
import { COLORS, COLOR_PALETTE, MENU_ITEMS, SHAPE_TYPES, BLOCK_TYPES, VIDEO_WIDTH, VIDEO_HEIGHT, BRUSH_SIZES } from '../constants';
import { Pen, Eraser, Trash2, Shapes, Palette, Move, Aperture, Box, Plus, Minus, Maximize, X, Activity, Scan, Target, Lock, Unlock, Hand, Circle } from 'lucide-react';

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
}

interface InteractiveZone {
  id: string; x: number; y: number; radius: number; action: () => void;
}

interface HologramSceneProps {
  hands: HandState[];
  onToggleBlur: () => void;
  isBlurred: boolean;
  tutorialStep?: number;
  onAction?: (action: string) => void;
  videoResolution?: { width: number, height: number };
}

const ICON_MAP: Record<string, any> = { Pen, Eraser, Trash2, Shapes, Palette, Move, Aperture, Box };

const isPath = (el: DrawingElement): el is DrawingPath => el.type === 'PATH';
const isShape = (el: DrawingElement): el is DrawingShape => el.type === 'SHAPE';
const isBlock = (el: DrawingElement): el is BlockElement => el.type === 'BLOCK';
const hasXY = (el: DrawingElement): el is DrawingShape | BlockElement => el.type !== 'PATH';

const HologramScene: React.FC<HologramSceneProps> = ({ hands, onToggleBlur, isBlurred, tutorialStep, onAction, videoResolution = { width: 1280, height: 720 } }) => {
  const [activeTool, setActiveTool] = useState<ActiveTool>('DRAW');
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const elementsRef = useRef<DrawingElement[]>([]);
  const [currentColor, setCurrentColor] = useState<string>(COLORS.CYAN);
  const [activeShape, setActiveShape] = useState<ShapeType>('CIRCLE');
  const [activeBlockType, setActiveBlockType] = useState<string>('BLOCK');
  const [currentBrushSize, setCurrentBrushSize] = useState<number>(6);
  
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [hoveredZones, setHoveredZones] = useState<Record<string, string | null>>({});
  
  // Mouse simulation state
  const [mouseHand, setMouseHand] = useState<HandState | null>(null);
  const isMouseDown = useRef(false);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const smoothedHandsRef = useRef<Record<string, {x: number, y: number, z: number}>>({});
  const SMOOTHING = 0.75; // Increased for less jitter (was 0.6)

  // Interaction states (using refs for logic to avoid infinite loops)
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const handGrabbingCornersRef = useRef<Record<string, number | null>>({});
  const creationStartRef = useRef<Record<string, {x: number, y: number} | null>>({});
  const tempIdRef = useRef<Record<string, string | null>>({});

  const lastPlacementTime = useRef<Record<string, number>>({});
  const activePathIds = useRef<Record<string, string>>({});
  const lastActionTime = useRef<Record<string, number>>({});
  const particlesRef = useRef<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const isMobile = windowSize.width < 768;

  const videoScale = useMemo(() => {
    const { width: w, height: h } = windowSize;
    const { width: vw, height: vh } = videoResolution;
    const s = Math.max(w / vw, h / vh);
    return {
      scale: s,
      offsetX: (w - vw * s) / 2,
      offsetY: (h - vh * s) / 2,
      displayedWidth: vw * s,
      displayedHeight: vh * s
    };
  }, [windowSize, videoResolution]);

  const getHandPos = useCallback((nx: number, ny: number) => {
    // Mirrored view (selfie mode)
    return {
      x: (1 - nx) * videoScale.displayedWidth + videoScale.offsetX,
      y: ny * videoScale.displayedHeight + videoScale.offsetY
    };
  }, [videoScale]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ACTION_COOLDOWN = 300;
  const getHandleSize = () => Math.max(12, Math.min(windowSize.width, windowSize.height) * 0.02);
  const getMenuCenter = () => ({
    x: windowSize.width - (windowSize.width < 1000 ? 50 : 80),
    y: windowSize.height / 2
  });
  const getMenuRadius = () => Math.min(windowSize.height * 0.35, windowSize.width * 0.25);
  const getMenuItemSize = () => Math.max(64, Math.min(windowSize.width * 0.07, windowSize.height * 0.1));
  const getColorItemSize = () => Math.max(40, Math.min(60, windowSize.width / (COLOR_PALETTE.length + 4)));
  const getToolItemWidth = (count: number) => Math.max(80, Math.min(120, windowSize.width / (count + 4)));

  const createParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0, color
      });
    }
  };

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      updateMouseHand(e);
    };
    const handleMouseMove = (e: MouseEvent) => {
      updateMouseHand(e);
    };
    const handleMouseUp = () => {
      isMouseDown.current = false;
      setMouseHand(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        setIsMenuVisible(prev => !prev);
      }
    };

    const updateMouseHand = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      
      // Calculate normalized coordinates relative to the video frame
      const nx = (x - videoScale.offsetX) / videoScale.displayedWidth;
      const ny = (y - videoScale.offsetY) / videoScale.displayedHeight;
      
      const isShift = e.shiftKey;
      
      // Clear existing timeout
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      
      // Mirrored view (selfie mode)
      // Use 'Mouse' handedness to avoid conflict with real hands
      setMouseHand({
        landmarks: [],
        handedness: 'Mouse',
        gesture: isMouseDown.current ? (isShift ? 'GRAB' : 'PINCH') : 'NONE',
        pinchStrength: isMouseDown.current ? 1 : 0,
        isPinching: isMouseDown.current && !isShift,
        isGrabbing: isMouseDown.current && isShift,
        raisedFingers: 0,
        pinchPoint: { x: 1 - nx, y: ny, z: 0.5 },
        velocity: { x: 0, y: 0 }
      });

      // Hide mouse hand after 2 seconds of inactivity
      mouseTimeoutRef.current = setTimeout(() => {
        setMouseHand(null);
      }, 2000);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    };
  }, [videoScale]);

  const lastTutorialReport = useRef<Record<string, number>>({});

  const zones = useMemo(() => {
    const { width: w, height: h } = windowSize;
    const z: InteractiveZone[] = [];

    // 1. TOP HUD: Color Matrix
    const colorSize = getColorItemSize();
    const colorStartX = (w - (COLOR_PALETTE.length * (colorSize + 10))) / 2;
    COLOR_PALETTE.forEach((c, i) => {
      z.push({
        id: `color-${i}`, x: colorStartX + i * (colorSize + 10) + (colorSize / 2), y: 50, radius: colorSize / 2,
        action: () => setCurrentColor(c)
      });
    });

    // 1.5 TOP HUD: Brush Size Matrix
    const brushSizeItemWidth = 60;
    const brushStartX = (w - (BRUSH_SIZES.length * (brushSizeItemWidth + 10))) / 2;
    BRUSH_SIZES.forEach((b, i) => {
      z.push({
        id: `brush-${i}`, x: brushStartX + i * (brushSizeItemWidth + 10) + (brushSizeItemWidth / 2), y: 110, radius: brushSizeItemWidth / 2,
        action: () => setCurrentBrushSize(b.size)
      });
    });

    // 2. TOP HUD: Contextual Tool Matrix
    if (activeTool === 'SHAPE' || activeTool === 'BLOCK_MODE') {
      const list = activeTool === 'SHAPE' ? SHAPE_TYPES : BLOCK_TYPES;
      const toolWidth = getToolItemWidth(list.length);
      const toolStartX = (w - (list.length * (toolWidth + 15))) / 2;
      list.forEach((opt, i) => {
        z.push({
          id: `opt-${i}`, x: toolStartX + i * (toolWidth + 15) + (toolWidth / 2), y: 130, radius: toolWidth / 2,
          action: () => {
            if (activeTool === 'SHAPE') setActiveShape(SHAPE_TYPES[i].type);
            else setActiveBlockType(BLOCK_TYPES[i].type);
          }
        });
      });
    }

    // 3. RADIAL MENU / MOBILE BOTTOM BAR
    if (isMenuVisible) {
      if (isMobile) {
        // Mobile Bottom Bar Layout
        const itemSize = Math.min(60, w / (MENU_ITEMS.length + 1));
        const barY = h - 60;
        const startX = (w - (MENU_ITEMS.length * (itemSize + 10))) / 2;
        
        MENU_ITEMS.forEach((item, index) => {
          z.push({
            id: item.id,
            x: startX + index * (itemSize + 10) + itemSize / 2,
            y: barY,
            radius: itemSize / 1.5,
            action: () => {
              onAction?.('SELECT_TOOL');
              if (item.tool === 'CLEAR') { setElements([]); setFocusedId(null); }
              else if (item.tool === 'BLUR') onToggleBlur();
              else { setActiveTool(item.tool as ActiveTool); setFocusedId(null); }
            }
          });
        });
      } else {
        const menuCenter = getMenuCenter();
        const menuRadius = getMenuRadius();
        const itemSize = getMenuItemSize();
        MENU_ITEMS.forEach((item, index) => {
          const angle = Math.PI * 0.75 + (index / (MENU_ITEMS.length - 1)) * (Math.PI * 0.5);
          z.push({
            id: item.id, x: menuCenter.x + Math.cos(angle) * menuRadius, y: menuCenter.y + Math.sin(angle) * menuRadius, radius: itemSize / 1.2, 
            action: () => {
              onAction?.('SELECT_TOOL');
              if (item.tool === 'CLEAR') { setElements([]); setFocusedId(null); }
              else if (item.tool === 'BLUR') onToggleBlur();
              else { setActiveTool(item.tool as ActiveTool); setFocusedId(null); }
            }
          });
        });
      }
    }
    return z;
  }, [activeTool, isMenuVisible, onToggleBlur, onAction, windowSize, isMobile]);

  useEffect(() => {
    const now = Date.now();
    const { width: w, height: h } = windowSize;
    const newHoveredZones: Record<string, string | null> = {};
    const handCapturedByUI = new Set<string>();

    const allHands = mouseHand ? [...hands, mouseHand] : hands;

    let currentElements = [...elementsRef.current];
    let elementsChanged = false;

    // Helper for throttled actions
    const reportAction = (action: string, cooldown = 1000) => {
      if (!onAction) return;
      const lastTime = lastActionTime.current[action] || 0;
      if (now - lastTime > cooldown) {
        onAction(action);
        lastActionTime.current[action] = now;
      }
    };

    // 4. HAND PROCESSING
    allHands.forEach(hand => {
      const key = hand.handedness;
      
      // Apply smoothing to pinchPoint
      if (!smoothedHandsRef.current[key]) {
        smoothedHandsRef.current[key] = { ...hand.pinchPoint };
      } else {
        smoothedHandsRef.current[key].x = smoothedHandsRef.current[key].x * SMOOTHING + hand.pinchPoint.x * (1 - SMOOTHING);
        smoothedHandsRef.current[key].y = smoothedHandsRef.current[key].y * SMOOTHING + hand.pinchPoint.y * (1 - SMOOTHING);
        smoothedHandsRef.current[key].z = smoothedHandsRef.current[key].z * SMOOTHING + hand.pinchPoint.z * (1 - SMOOTHING);
      }

      const nx = smoothedHandsRef.current[key].x;
      const ny = smoothedHandsRef.current[key].y;
      const { x, y } = getHandPos(nx, ny);
      
      const hit = zones.find(z => {
        const dx = x - z.x;
        const dy = y - z.y;
        return (dx * dx + dy * dy) < (z.radius * z.radius);
      });

      if (hit) {
        newHoveredZones[key] = hit.id;
        handCapturedByUI.add(key);
        if (hand.isPinching && now - (lastActionTime.current[key] || 0) > ACTION_COOLDOWN) {
          hit.action();
          lastActionTime.current[key] = now;
          reportAction('SELECT_TOOL', 500);
        }
        return;
      }

    // WORLD SPACE INTERACTION
    const isClenching = hand.gesture === 'GRAB';
    const isPinching = hand.isPinching;

    // Report gestures for tutorial verification even if no object is hit
    if (isPinching) {
      reportAction('PINCH', 1500);
    }
    if (isClenching) {
      reportAction('GRAB', 1500);
    }

      if (activeTool === 'SELECT') {
        // MOVE LOGIC: Clench (Grab) to drag
        if (isClenching) {
          if (!draggingIdRef.current) {
            const target = currentElements.slice().reverse().find(el => hasXY(el) && Math.sqrt(Math.pow(nx - el.x, 2) + Math.pow(ny - el.y, 2)) < 0.15);
            if (target && hasXY(target)) {
              setDraggingId(target.id);
              dragOffsetRef.current = { x: target.x - nx, y: target.y - ny };
              setFocusedId(target.id);
              reportAction('GRAB', 1000);
            }
          } else {
            currentElements = currentElements.map(el => (el.id === draggingIdRef.current && hasXY(el)) ? { ...el, x: nx + dragOffsetRef.current.x, y: ny + dragOffsetRef.current.y } as any : el);
            elementsChanged = true;
            reportAction('MOVE', 1000);
          }
        } else {
          if (draggingIdRef.current) setDraggingId(null);
        }

        // RESIZE LOGIC: Pinch handles of focused object
        if (isPinching) {
          if (focusedId) {
            const focusedEl = currentElements.find(e => e.id === focusedId);
            if (focusedEl && (isShape(focusedEl) || isBlock(focusedEl))) {
              const el = focusedEl as DrawingShape | BlockElement;
              const cs = [
                {x:el.x - el.width/2/videoScale.displayedWidth, y:el.y - el.height/2/videoScale.displayedHeight}, // TL
                {x:el.x + el.width/2/videoScale.displayedWidth, y:el.y - el.height/2/videoScale.displayedHeight}, // TR
                {x:el.x + el.width/2/videoScale.displayedWidth, y:el.y + el.height/2/videoScale.displayedHeight}, // BR
                {x:el.x - el.width/2/videoScale.displayedWidth, y:el.y + el.height/2/videoScale.displayedHeight}  // BL
              ];
              const HANDLE_HIT_RADIUS = getHandleSize() / Math.min(videoScale.displayedWidth, videoScale.displayedHeight) * 1.5;
              const cIdx = cs.findIndex(c => Math.sqrt(Math.pow(nx - c.x, 2) + Math.pow(ny - c.y, 2)) < HANDLE_HIT_RADIUS);
              if (cIdx !== -1) {
                handGrabbingCornersRef.current[key] = cIdx;
                reportAction('PINCH', 1000);
              } else if (now - (lastActionTime.current[key] || 0) > 400) {
                 // Clicking void unfocuses
                 const target = currentElements.slice().reverse().find(el => hasXY(el) && Math.sqrt(Math.pow(nx - el.x, 2) + Math.pow(ny - el.y, 2)) < 0.15);
                 if (!target) {
                   setFocusedId(null);
                   lastActionTime.current[key] = now;
                 } else if (target.id !== focusedId) {
                   setFocusedId(target.id);
                   lastActionTime.current[key] = now;
                 }
              }
            }
          } else {
             // Pinch to focus if nothing is focused
             const target = currentElements.slice().reverse().find(el => hasXY(el) && Math.sqrt(Math.pow(nx - el.x, 2) + Math.pow(ny - el.y, 2)) < 0.15);
             if (target && hasXY(target)) {
                setFocusedId(target.id);
             }
          }
        } else {
          delete handGrabbingCornersRef.current[key];
        }
      } else if (isPinching) {
        // Creation Logic
        if (activeTool === 'SHAPE' || activeTool === 'BLOCK_MODE') {
            if (!creationStartRef.current[key]) {
              creationStartRef.current[key] = { x: nx, y: ny };
              tempIdRef.current[key] = Math.random().toString(36).substr(2, 9);
            } else {
              const start = creationStartRef.current[key]!;
              const dW = Math.abs(nx - start.x) * 2 * videoScale.displayedWidth;
              const dH = Math.abs(ny - start.y) * 2 * videoScale.displayedHeight;
              const sId = tempIdRef.current[key]!;
              const is3D = activeTool === 'BLOCK_MODE';
              
              const newEl: DrawingElement = is3D 
                ? { id: sId, type: 'BLOCK', blockType: activeBlockType as any, x: start.x, y: start.y, z: 0, width: dW, height: dH, depth: (dW + dH) / 2, color: currentColor }
                : { id: sId, type: 'SHAPE', shapeType: activeShape, x: start.x, y: start.y, z: 0, width: dW, height: dH, color: currentColor, rotation: 0 };
              
              if (currentElements.find(e => e.id === sId)) {
                currentElements = currentElements.map(e => e.id === sId ? newEl : e);
              } else {
                currentElements = [...currentElements, newEl];
              }
              elementsChanged = true;
              reportAction('PINCH', 1000);
            }
        } else if (activeTool === 'DRAW') {
          const pId = activePathIds.current[key] || Math.random().toString(36).substr(2, 9);
          if (!activePathIds.current[key]) {
            currentElements = [...currentElements, { id: pId, type: 'PATH', points: [{ x: nx, y: ny, z: hand.pinchPoint.z }], color: currentColor, width: currentBrushSize }];
            activePathIds.current[key] = pId;
            elementsChanged = true;
          } else {
            const path = currentElements.find(el => isPath(el) && el.id === pId) as DrawingPath;
            if (path) {
              const lastPt = path.points[path.points.length - 1];
              const dist = Math.sqrt(Math.pow(nx - lastPt.x, 2) + Math.pow(ny - lastPt.y, 2));
              // Stabilization threshold: only add point if moved enough
              if (dist > 0.005) {
                currentElements = currentElements.map(el => (isPath(el) && el.id === pId) ? { ...el, points: [...el.points, { x: nx, y: ny, z: smoothedHandsRef.current[key].z }] } : el);
                elementsChanged = true;
              }
            }
          }
          reportAction('PINCH', 1000);
        } else if (activeTool === 'ERASE') {
            const beforeCount = currentElements.length;
            currentElements = currentElements.filter(el => {
              if (isPath(el)) return !el.points.some(pt => Math.sqrt(Math.pow(pt.x - nx, 2) + Math.pow(pt.y - ny, 2)) < 0.08);
              return Math.sqrt(Math.pow(el.x - nx, 2) + Math.pow(el.y - ny, 2)) > 0.18;
            });
            if (currentElements.length !== beforeCount) elementsChanged = true;
            reportAction('PINCH', 1000);
        }
      } else {
        delete activePathIds.current[key];
        creationStartRef.current[key] = null;
        tempIdRef.current[key] = null;
        delete handGrabbingCornersRef.current[key];
      }
    });

    // Multi-hand corner stretch for focused object
    const gKeys = Object.keys(handGrabbingCornersRef.current).filter(k => handGrabbingCornersRef.current[k] !== null);
    if (gKeys.length >= 2 && focusedId) {
      const fEl = currentElements.find(e => e.id === focusedId);
      if (fEl && (isShape(fEl) || isBlock(fEl))) {
        const el = fEl as DrawingShape | BlockElement;
        const h1Key = gKeys[0];
        const h2Key = gKeys[1];
        const h1 = allHands.find(h => h.handedness === h1Key)!;
        const h2 = allHands.find(h => h.handedness === h2Key)!;
        const p1 = { x: h1.pinchPoint.x, y: h1.pinchPoint.y };
        const p2 = { x: h2.pinchPoint.x, y: h2.pinchPoint.y };
        const nW = Math.abs(p1.x - p2.x) * videoScale.displayedWidth;
        const nH = Math.abs(p1.y - p2.y) * videoScale.displayedHeight;
        if (!isNaN(nW) && !isNaN(nH)) {
          currentElements = currentElements.map(e => e.id === focusedId ? { 
            ...e, 
            width: Math.max(60, nW), 
            height: Math.max(60, nH),
            ...(isBlock(e) ? { depth: Math.max(40, (nW + nH) / 2) } : {})
          } as any : e);
          elementsChanged = true;
        }
      }
    } else if (gKeys.length === 1 && focusedId) {
      // Single hand resize
      const handKey = gKeys[0];
      const h = allHands.find(hand => hand.handedness === handKey)!;
      const fEl = currentElements.find(e => e.id === focusedId);
      if (fEl && (isShape(fEl) || isBlock(fEl))) {
        const el = fEl as DrawingShape | BlockElement;
        const nx = h.pinchPoint.x;
        const ny = h.pinchPoint.y;
        const nW = Math.abs(nx - el.x) * 2 * videoScale.displayedWidth;
        const nH = Math.abs(ny - el.y) * 2 * videoScale.displayedHeight;
        if (!isNaN(nW) && !isNaN(nH)) {
          currentElements = currentElements.map(e => e.id === focusedId ? { 
            ...e, 
            width: Math.max(60, nW), 
            height: Math.max(60, nH),
            ...(isBlock(e) ? { depth: Math.max(40, (nW + nH) / 2) } : {})
          } as any : e);
          elementsChanged = true;
          reportAction('PINCH', 1000);
        }
      }
    }

    if (elementsChanged) {
      setElements(currentElements);
    }

    // Only update hovered zones if they actually changed to prevent unnecessary re-renders
    const zonesChanged = JSON.stringify(newHoveredZones) !== JSON.stringify(hoveredZones);
    if (zonesChanged) {
      setHoveredZones(newHoveredZones);
    }
  }, [hands, mouseHand, activeTool, currentColor, activeShape, focusedId, isMenuVisible, onToggleBlur, onAction, windowSize]);

  useEffect(() => {
    let anim: number;
    const render = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      const w = canvasRef.current.width; const h = canvasRef.current.height;
      ctx.clearRect(0, 0, w, h);
      ctx.shadowBlur = 0;

      particlesRef.current.forEach(p => { 
        p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
        if (p.life > 0) { 
          ctx.beginPath(); 
          const hexAlpha = Math.floor(p.life * 255).toString(16).padStart(2, '0');
          ctx.fillStyle = `${p.color}${hexAlpha}`; 
          // Fix: Ensure the arithmetic operation Math.PI * 2 uses correct types by casting if necessary.
          // Line 264 in the error log likely refers to an arithmetic operation here.
          ctx.arc(p.x, p.y, (4 * (p.life as number)), 0, (Math.PI * 2) as number); 
          ctx.fill(); 
        } 
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      elements.forEach(el => {
        const isFocused = focusedId === el.id;
        const isDragging = draggingId === el.id;
        // Optimization: Reduce shadow blur for non-focused elements
        ctx.strokeStyle = el.color; ctx.shadowBlur = isFocused ? 20 : (isDragging ? 30 : 0); ctx.shadowColor = el.color;
        
        if (isPath(el)) {
          ctx.lineWidth = el.width || 4; ctx.beginPath(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          el.points.forEach((pt, i) => {
            const { x, y } = getHandPos(pt.x, pt.y);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (isBlock(el)) {
          const { width: bw, height: bh, depth: bd } = el;
          const halfW = bw / 2;
          const halfH = bh / 2;
          const off = bd * 0.4;
          
          const { x, y } = getHandPos(el.x, el.y);
          ctx.save();
          ctx.translate(x, y);
          
          ctx.fillStyle = el.color + '44';
          
          if (el.blockType === 'BLOCK' || el.blockType === 'CUBE' || el.blockType === 'PRISM') {
            // Front face
            ctx.beginPath(); ctx.rect(-halfW, -halfH, bw, bh); ctx.fill(); ctx.stroke();
            // Top face
            ctx.beginPath(); ctx.moveTo(-halfW, -halfH); ctx.lineTo(-halfW + off, -halfH - off); ctx.lineTo(halfW + off, -halfH - off); ctx.lineTo(halfW, -halfH); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Side face
            ctx.beginPath(); ctx.moveTo(halfW, -halfH); ctx.lineTo(halfW + off, -halfH - off); ctx.lineTo(halfW + off, bh - halfH - off); ctx.lineTo(halfW, bh - halfH); ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (el.blockType === 'SPHERE') {
            // Improved Sphere rendering with more latitude/longitude lines for depth
            ctx.beginPath();
            ctx.ellipse(0, 0, bw/2, bh/2, 0, 0, Math.PI*2);
            ctx.fillStyle = el.color + '44';
            ctx.fill();
            ctx.stroke();
            
            // Latitude lines
            for (let i = 1; i < 6; i++) {
              const rY = (bh/2) * Math.sin((i * Math.PI) / 6);
              const rX = (bw/2) * Math.cos((i * Math.PI) / 6);
              ctx.beginPath();
              ctx.ellipse(0, 0, bw/2, rY, 0, 0, Math.PI*2);
              ctx.stroke();
              ctx.beginPath();
              ctx.ellipse(0, 0, rX, bh/2, 0, 0, Math.PI*2);
              ctx.stroke();
            }
          } else if (el.blockType === 'PYRAMID') {
            const apexX = 0, apexY = -bh/2 - off;
            // Base
            ctx.beginPath(); ctx.moveTo(-halfW, halfH); ctx.lineTo(halfW, halfH); ctx.lineTo(halfW + off, halfH - off); ctx.lineTo(-halfW + off, halfH - off); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Faces to apex
            ctx.beginPath(); ctx.moveTo(-halfW, halfH); ctx.lineTo(apexX, apexY); ctx.lineTo(halfW, halfH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(halfW, halfH); ctx.lineTo(apexX, apexY); ctx.lineTo(halfW + off, halfH - off); ctx.stroke();
          } else if (el.blockType === 'CYLINDER') {
            // Bottom ellipse
            ctx.beginPath(); ctx.ellipse(0, halfH, halfW, bh*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Sides
            ctx.beginPath(); ctx.moveTo(-halfW, halfH); ctx.lineTo(-halfW, -halfH); ctx.moveTo(halfW, halfH); ctx.lineTo(halfW, -halfH); ctx.stroke();
            // Top ellipse
            ctx.beginPath(); ctx.ellipse(0, -halfH, halfW, bh*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          } else if (el.blockType === 'CONE') {
            const apexX = 0, apexY = -halfH - off;
            // Bottom ellipse
            ctx.beginPath(); ctx.ellipse(0, halfH, halfW, bh*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Sides to apex
            ctx.beginPath(); ctx.moveTo(-halfW, halfH); ctx.lineTo(apexX, apexY); ctx.lineTo(halfW, halfH); ctx.stroke();
          } else if (el.blockType === 'CAPSULE') {
            ctx.beginPath();
            ctx.arc(0, -halfH + halfW, halfW, Math.PI, 0);
            ctx.lineTo(halfW, halfH - halfW);
            ctx.arc(0, halfH - halfW, halfW, 0, Math.PI);
            ctx.lineTo(-halfW, -halfH + halfW);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          
          if (isFocused) {
            ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.strokeRect(-el.width/2-25, -el.height/2-25, el.width+50, el.height+50);
            
            // WORLD HUD
            ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Orbitron';
            ctx.fillText(`LOCKED_ID: ${el.id.toUpperCase()}`, -el.width/2, -el.height/2 - 45);
            ctx.fillStyle = el.color; ctx.font = '10px Rajdhani';
            ctx.fillText(`MODE: FOCUS / RESIZE`, -el.width/2, -el.height/2 - 30);

            // CORNER HANDLES
            const HANDLE_SIZE = getHandleSize();
            [{x:-el.width/2,y:-el.height/2},{x:el.width/2,y:-el.height/2},{x:el.width/2,y:el.height/2},{x:-el.width/2,y:el.height/2}].forEach((c, i) => {
              const grabbed = Object.values(handGrabbingCornersRef.current).includes(i);
              ctx.fillStyle = grabbed ? '#fff' : el.color; ctx.shadowBlur = grabbed ? 20 : 0;
              ctx.fillRect(c.x-HANDLE_SIZE/2, c.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
              ctx.strokeStyle = '#fff'; ctx.strokeRect(c.x-HANDLE_SIZE/2, c.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            });
          }
          ctx.restore();
        } else if (isShape(el)) {
          const { x, y } = getHandPos(el.x, el.y);
          ctx.save(); ctx.translate(x, y); ctx.beginPath();
          if (el.shapeType === 'CIRCLE') ctx.ellipse(0,0,el.width/2,el.height/2,0,0,Math.PI*2);
          else if (el.shapeType === 'SQUARE') ctx.rect(-el.width/2,-el.height/2,el.width,el.height);
          else if (el.shapeType === 'TRIANGLE') { ctx.moveTo(0, -el.height/2); ctx.lineTo(el.width/2, el.height/2); ctx.lineTo(-el.width/2, el.height/2); ctx.closePath(); }
          else if (el.shapeType === 'HEXAGON') { for(let i=0; i<6; i++) { const a=(i*Math.PI)/3; ctx.lineTo((el.width/2)*Math.cos(a),(el.height/2)*Math.sin(a)); } ctx.closePath(); }
          else if (el.shapeType === 'STAR') {
            const spikes = 5; const outer = el.width/2; const inner = el.width/4;
            let rot = Math.PI/2*3; let x_s, y_s; const step = Math.PI/spikes;
            ctx.moveTo(0, -outer);
            for(let i=0; i<spikes; i++) {
              x_s = Math.cos(rot)*outer; y_s = Math.sin(rot)*outer; ctx.lineTo(x_s, y_s); rot += step;
              x_s = Math.cos(rot)*inner; y_s = Math.sin(rot)*inner; ctx.lineTo(x_s, y_s); rot += step;
            }
            ctx.closePath();
          } else if (el.shapeType === 'HEART') {
            const w_h = el.width; const h_h = el.height;
            ctx.moveTo(0, h_h/4);
            ctx.bezierCurveTo(0, h_h/4, -w_h/2, -h_h/2, -w_h/2, h_h/4);
            ctx.bezierCurveTo(-w_h/2, h_h/2, 0, h_h*0.8, 0, h_h);
            ctx.bezierCurveTo(0, h_h*0.8, w_h/2, h_h/2, w_h/2, h_h/4);
            ctx.bezierCurveTo(w_h/2, -h_h/2, 0, h_h/4, 0, h_h/4);
            ctx.closePath();
          } else if (el.shapeType === 'DIAMOND') {
            ctx.moveTo(0, -el.height/2); ctx.lineTo(el.width/2, 0); ctx.lineTo(0, el.height/2); ctx.lineTo(-el.width/2, 0); ctx.closePath();
          } else if (el.shapeType === 'PENTAGON') {
            for(let i=0; i<5; i++) { const a=(i*Math.PI*2)/5 - Math.PI/2; ctx.lineTo((el.width/2)*Math.cos(a),(el.height/2)*Math.sin(a)); } ctx.closePath();
          } else if (el.shapeType === 'OCTAGON') {
            for(let i=0; i<8; i++) { const a=(i*Math.PI*2)/8 + Math.PI/8; ctx.lineTo((el.width/2)*Math.cos(a),(el.height/2)*Math.sin(a)); } ctx.closePath();
          } else if (el.shapeType === 'PLUS') {
            const w8 = el.width/8; const h8 = el.height/8;
            ctx.moveTo(-w8, -el.height/2); ctx.lineTo(w8, -el.height/2); ctx.lineTo(w8, -h8); ctx.lineTo(el.width/2, -h8); ctx.lineTo(el.width/2, h8); ctx.lineTo(w8, h8); ctx.lineTo(w8, el.height/2); ctx.lineTo(-w8, el.height/2); ctx.lineTo(-w8, h8); ctx.lineTo(-el.width/2, h8); ctx.lineTo(-el.width/2, -h8); ctx.lineTo(-w8, -h8); ctx.closePath();
          }
          ctx.fillStyle = el.color + '22'; ctx.fill(); ctx.stroke();
          
          if (isFocused) {
            ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.strokeRect(-el.width/2-25, -el.height/2-25, el.width+50, el.height+50);
            
            // WORLD HUD
            ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Orbitron';
            ctx.fillText(`LOCKED_ID: ${el.id.toUpperCase()}`, -el.width/2, -el.height/2 - 45);
            ctx.fillStyle = el.color; ctx.font = '10px Rajdhani';
            ctx.fillText(`MODE: FOCUS / RESIZE`, -el.width/2, -el.height/2 - 30);

            // CORNER HANDLES
            const HANDLE_SIZE = getHandleSize();
            [{x:-el.width/2,y:-el.height/2},{x:el.width/2,y:-el.height/2},{x:el.width/2,y:el.height/2},{x:-el.width/2,y:el.height/2}].forEach((c, i) => {
              const grabbed = Object.values(handGrabbingCornersRef.current).includes(i);
              ctx.fillStyle = grabbed ? '#fff' : el.color; ctx.shadowBlur = grabbed ? 20 : 0;
              ctx.fillRect(c.x-HANDLE_SIZE/2, c.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
              ctx.strokeStyle = '#fff'; ctx.strokeRect(c.x-HANDLE_SIZE/2, c.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            });
          }
          ctx.restore();
        }
      });

      // Hand visualization
      const allHands = mouseHand ? [...hands, mouseHand] : hands;
      allHands.forEach(hand => {
        const key = hand.handedness;
        const smoothed = smoothedHandsRef.current[key] || hand.pinchPoint;
        const { x, y } = getHandPos(smoothed.x, smoothed.y);
        const isPinch = hand.isPinching;
        const isClench = hand.gesture === 'GRAB';

        ctx.shadowBlur = isPinch || isClench ? 15 : 0; ctx.shadowColor = currentColor;
        ctx.beginPath(); 
        ctx.strokeStyle = isClench ? '#ec4899' : (isPinch ? '#fff' : currentColor + '99'); 
        ctx.lineWidth = 4;
        ctx.arc(x, y, isPinch ? 24 : (isClench ? 32 : 44), 0, Math.PI*2); ctx.stroke();
        
        // FINGERTIP HUD
        ctx.shadowBlur = 0;
        
        // Hand Scanner Circle (from screenshot)
        if (hand.landmarks.length > 0) {
          const palm = hand.landmarks[9]; // Middle finger MCP
          const { x: px, y: py } = getHandPos(palm.x, palm.y);
          
          ctx.beginPath();
          ctx.strokeStyle = '#93c5fd'; // Light blue
          ctx.lineWidth = 2;
          ctx.arc(px, py, 120, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.strokeStyle = '#22d3ee'; // Cyan
          ctx.lineWidth = 1;
          ctx.arc(px, py, 40, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x + 50, y - 60, 80, 40);
        ctx.strokeStyle = isClench ? '#ec4899' : currentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 50, y - 60, 80, 40);

        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Orbitron';
        ctx.fillText(`${hand.handedness.toUpperCase()}`, x + 55, y - 40);
        ctx.fillStyle = isClench ? '#ec4899' : currentColor; ctx.font = '11px Rajdhani';
        ctx.fillText(`G_MODE: ${hand.gesture}`, x + 55, y - 22);
        if (isClench) { ctx.fillStyle='#ec4899'; ctx.font='bold 10px Orbitron'; ctx.fillText(`[ ATTACH_LOCKED ]`, x+55, y); }
      });

      anim = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(anim);
  }, [elements, focusedId, hands, mouseHand, currentColor, windowSize]);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} width={windowSize.width} height={windowSize.height} className="absolute inset-0" />

      {/* TOP HUD: PERSISTENT COLOR BAR */}
      <div className={`absolute left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black border-4 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 ${isMobile ? 'top-4 scale-90' : 'top-8'}`}>
         {COLOR_PALETTE.map((c, i) => {
           const size = getColorItemSize();
           return (
            <div key={i} className={`border-2 transition-all duration-200 cursor-pointer ${currentColor === c ? 'border-white scale-110 shadow-[0_0_20px_white]' : 'border-transparent opacity-40'} ${Object.values(hoveredZones).includes(`color-${i}`) ? 'opacity-100 scale-105' : ''}`}
                 style={{ backgroundColor: c, width: size, height: size }} />
           );
         })}
      </div>

      {/* BRUSH SIZE BAR */}
      <div className={`absolute left-1/2 -translate-x-1/2 flex gap-2 p-1 bg-black/80 border-2 border-cyan-400/50 transition-all duration-300 ${isMobile ? 'top-16 scale-75' : 'top-24'}`}>
         {BRUSH_SIZES.map((b, i) => {
           const isSelected = currentBrushSize === b.size;
           const isHovered = Object.values(hoveredZones).includes(`brush-${i}`);
           return (
            <div key={i} className={`w-12 h-10 flex flex-col items-center justify-center border transition-all duration-200 cursor-pointer 
                 ${isSelected ? 'border-pink-500 bg-pink-500/20 text-white' : 'border-cyan-500/30 text-cyan-500/60'}
                 ${isHovered ? 'border-white scale-110' : ''}`}>
               <div className="font-mono text-[10px] font-bold">{b.label}</div>
               <div className="w-full h-[1px] bg-cyan-500/20 my-1" />
               <div className="w-1 h-1 rounded-full bg-white" style={{ width: b.size/2, height: b.size/2 }} />
            </div>
           );
         })}
      </div>

      {/* TOP HUD: CONTEXTUAL TOOL BAR */}
      <div className={`transition-all duration-500 absolute left-1/2 -translate-x-1/2 flex gap-4 ${activeTool === 'SHAPE' || activeTool === 'BLOCK_MODE' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'} ${isMobile ? 'top-20 scale-75' : 'top-32'}`}>
          {(activeTool === 'SHAPE' ? SHAPE_TYPES : BLOCK_TYPES).map((opt, i) => {
            const isSelected = activeTool === 'SHAPE' ? activeShape === (opt as any).type : activeBlockType === (opt as any).type;
            const isHovered = Object.values(hoveredZones).includes(`opt-${i}`);
            const width = getToolItemWidth((activeTool === 'SHAPE' ? SHAPE_TYPES : BLOCK_TYPES).length);
            return (
              <div key={i} className={`h-16 border-2 flex flex-col items-center justify-center transition-all duration-200
                   ${isSelected ? 'border-pink-500 bg-pink-500/20 shadow-[4px_4px_0px_#ec4899]' : 'border-cyan-500/30 bg-black'}
                   ${isHovered ? 'border-white scale-105' : ''}`}
                   style={{ width }}>
                 <div className="font-mono text-[10px] text-white uppercase text-center font-bold tracking-widest">{(opt as any).label}</div>
                 <div className="w-full h-[1px] bg-cyan-500/20 mt-1" />
                 <div className="font-mono text-[8px] text-cyan-500/60 mt-1 uppercase">0{i+1}</div>
              </div>
            );
          })}
      </div>

      {/* RADIAL MENU / MOBILE BOTTOM BAR */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isMenuVisible ? 'opacity-100' : 'opacity-0'}`}>
         {MENU_ITEMS.map((item, idx) => {
            const menuCenter = getMenuCenter();
            const menuRadius = getMenuRadius();
            const itemSize = getMenuItemSize();
            
            let x, y;
            if (isMobile) {
              const mobileItemSize = Math.min(60, windowSize.width / (MENU_ITEMS.length + 1));
              const startX = (windowSize.width - (MENU_ITEMS.length * (mobileItemSize + 10))) / 2;
              x = startX + idx * (mobileItemSize + 10) + mobileItemSize / 2;
              y = windowSize.height - 60;
            } else {
              const angle = Math.PI * 0.75 + (idx / (MENU_ITEMS.length - 1)) * (Math.PI * 0.5);
              x = menuCenter.x + Math.cos(angle) * menuRadius;
              y = menuCenter.y + Math.sin(angle) * menuRadius;
            }

            const isActive = activeTool === item.tool || (item.tool === 'BLUR' && isBlurred);
            const isHovered = Object.values(hoveredZones).includes(item.id);
            const Icon = ICON_MAP[item.icon];
            const finalSize = isMobile ? Math.min(60, windowSize.width / (MENU_ITEMS.length + 1)) : itemSize;

            return (
              <div key={item.id} className={`absolute border-2 flex flex-col items-center justify-center transition-all duration-200
                    ${isActive ? 'border-pink-500 bg-pink-500/30 shadow-[6px_6px_0px_#ec4899] scale-110' : 'border-cyan-500/50 bg-black'}
                    ${isHovered ? 'border-white scale-115 shadow-[0_0_20px_#fff]' : ''}`}
                  style={{ left: x, top: y, transform: 'translate(-50%, -50%)', width: finalSize, height: finalSize }}>
               <Icon size={finalSize * 0.4} className={isActive ? 'text-pink-300' : 'text-cyan-400'} />
               {!isMobile && <div className="font-mono text-[9px] mt-2 text-white uppercase font-bold tracking-tighter">{item.label}</div>}
               <div className="absolute -bottom-2 -right-2 bg-white text-black font-mono text-[8px] px-1 font-bold">0{idx+1}</div>
             </div>
            );
         })}
      </div>

      {/* WORLD SPACE HUD: LOCKED STATUS */}
      {focusedId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-5 bg-pink-500/25 border border-pink-500/50 px-10 py-4 rounded-full backdrop-blur-2xl animate-pulse shadow-[0_0_60px_rgba(236,72,153,0.3)]">
           <Target size={24} className="text-pink-400" />
           <span className="hologram-font text-pink-300 text-[15px] tracking-[0.4em] uppercase font-bold">Entity Focused & Locked</span>
        </div>
      )}
    </div>
  );
};

export default HologramScene;
