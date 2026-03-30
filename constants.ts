
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;

export const COLORS = {
  CYAN: '#06b6d4',
  MAGENTA: '#ec4899',
  ORANGE: '#f97316',
  NEON_GREEN: '#10b981',
  YELLOW: '#facc15',
  PURPLE: '#a855f7',
  WHITE: '#ffffff'
};

export const COLOR_PALETTE = [
  COLORS.CYAN,
  COLORS.MAGENTA,
  COLORS.NEON_GREEN,
  COLORS.YELLOW,
  COLORS.PURPLE,
  COLORS.WHITE
];

export const SHAPE_TYPES: { type: any; label: string }[] = [
  { type: 'CIRCLE', label: 'CIRC' },
  { type: 'SQUARE', label: 'RECT' },
  { type: 'TRIANGLE', label: 'TRI' },
  { type: 'HEXAGON', label: 'HEX' },
  { type: 'PENTAGON', label: 'PENT' },
  { type: 'OCTAGON', label: 'OCTA' },
  { type: 'STAR', label: 'STAR' },
  { type: 'HEART', label: 'HEART' },
  { type: 'DIAMOND', label: 'DIAM' },
  { type: 'PLUS', label: 'PLUS' },
];

export const BLOCK_TYPES: { type: any; label: string }[] = [
  { type: 'BLOCK', label: 'CUBE' },
  { type: 'SPHERE', label: 'SPHERE' },
  { type: 'PYRAMID', label: 'PYRA' },
  { type: 'CYLINDER', label: 'CYL' },
  { type: 'CONE', label: 'CONE' },
  { type: 'CAPSULE', label: 'CAPS' },
];

export const THRESHOLDS = {
  PINCH_START: 0.05,
  PINCH_RELEASE: 0.08,
  GRAB_CURL: 0.12,
  SMOOTHING_FACTOR: 0.35, // Increased for less jitter
  MENU_HOVER_DIST: 0.06,
  RESIZE_HANDLE_DIST: 0.08,
  SHAPE_SELECT_DIST: 0.12
};

export const BRUSH_SIZES = [
  { size: 2, label: 'XS' },
  { size: 6, label: 'S' },
  { size: 12, label: 'M' },
  { size: 24, label: 'L' },
  { size: 48, label: 'XL' }
];

export const MENU_ITEMS = [
  { id: 'tool-select', label: 'MOVE', icon: 'Move', tool: 'SELECT' },
  { id: 'tool-draw', label: 'DRAW', icon: 'Pen', tool: 'DRAW' },
  { id: 'tool-blocks', label: 'BLOCKS', icon: 'Box', tool: 'BLOCK_MODE' },
  { id: 'tool-shape', label: 'SHAPE', icon: 'Shapes', tool: 'SHAPE' },
  { id: 'tool-blur', label: 'BLUR', icon: 'Aperture', tool: 'BLUR' },
  { id: 'tool-erase', label: 'ERASE', icon: 'Eraser', tool: 'ERASE' },
  { id: 'tool-clear', label: 'CLEAR', icon: 'Trash2', tool: 'CLEAR' }
];
