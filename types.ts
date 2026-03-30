
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'NONE' | 'PINCH' | 'GRAB' | 'RELAX' | 'THUMBS_UP';
export type ActiveTool = 'SELECT' | 'DRAW' | 'ERASE' | 'SHAPE' | 'COLOR' | 'BLUR' | 'BLOCK_MODE' | 'NONE';
export type ShapeType = 'CIRCLE' | 'SQUARE' | 'TRIANGLE' | 'HEXAGON' | 'PENTAGON' | 'OCTAGON' | 'STAR' | 'HEART' | 'DIAMOND' | 'PLUS' | 'CUBE' | 'PRISM';
export type BlockType = 'BLOCK' | 'CUBE' | 'PRISM' | 'SPHERE' | 'PYRAMID' | 'CYLINDER' | 'CONE' | 'CAPSULE';

export interface DrawingPath {
  id: string;
  type: 'PATH';
  points: { x: number; y: number; z: number }[];
  color: string;
  width: number;
}

export interface DrawingShape {
  id: string;
  type: 'SHAPE';
  shapeType: ShapeType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}

export type DrawingElement = DrawingPath | DrawingShape | BlockElement;

export interface BlockElement {
  id: string;
  type: 'BLOCK';
  blockType: BlockType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
}

export interface HandState {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right' | 'Mouse';
  gesture: GestureType;
  pinchStrength: number;
  isPinching: boolean;
  isGrabbing: boolean;
  raisedFingers: number;
  pinchPoint: { x: number; y: number; z: number };
  velocity: { x: number; y: number };
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetTool?: ActiveTool;
  targetGesture?: GestureType;
  actionRequired?: 'PINCH' | 'GRAB' | 'MOVE' | 'SELECT_TOOL' | 'NONE';
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  tool: ActiveTool | 'CLEAR' | 'MULTI_HAND';
  subItems?: string[];
}
