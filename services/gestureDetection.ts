
import { Landmark, GestureType } from '../types';
import { THRESHOLDS } from '../constants';

export const calculateDistance = (p1: Landmark, p2: Landmark) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

export const detectGesture = (landmarks: Landmark[]): {
  gesture: GestureType;
  pinchStrength: number;
  pinchPoint: { x: number; y: number; z: number };
  raisedFingers: number;
} => {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: 'NONE', pinchStrength: 0, pinchPoint: { x: 0, y: 0, z: 0 }, raisedFingers: 0 };
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = calculateDistance(thumbTip, indexTip);
  
  const pinchPoint = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
    z: (thumbTip.z + indexTip.z) / 2
  };

  const wrist = landmarks[0];
  
  // Detect raised status for each finger
  const isIndexRaised = calculateDistance(landmarks[8], wrist) > calculateDistance(landmarks[6], wrist);
  const isMiddleRaised = calculateDistance(landmarks[12], wrist) > calculateDistance(landmarks[10], wrist);
  const isRingRaised = calculateDistance(landmarks[16], wrist) > calculateDistance(landmarks[14], wrist);
  const isPinkyRaised = calculateDistance(landmarks[20], wrist) > calculateDistance(landmarks[18], wrist);
  const isThumbRaised = calculateDistance(landmarks[4], landmarks[5]) > 0.07;

  let raisedFingers = 0;
  if (isIndexRaised) raisedFingers++;
  if (isMiddleRaised) raisedFingers++;
  if (isRingRaised) raisedFingers++;
  if (isPinkyRaised) raisedFingers++;
  if (isThumbRaised) raisedFingers++;

  // Thumbs Up Detection:
  // 1. Thumb is raised and pointing up (tip y is lower than base y)
  // 2. All other fingers are curled (not raised)
  const isThumbPointingUp = thumbTip.y < landmarks[2].y;
  const isThumbsUp = isThumbRaised && isThumbPointingUp && !isIndexRaised && !isMiddleRaised && !isRingRaised && !isPinkyRaised;

  const tips = [8, 12, 16, 20];
  const avgTipDist = tips.reduce((acc, idx) => acc + calculateDistance(landmarks[idx], wrist), 0) / 4;
  const isGrabbing = avgTipDist < THRESHOLDS.GRAB_CURL;
  const isPinching = distance < THRESHOLDS.PINCH_START;

  let gesture: GestureType = 'RELAX';
  if (isThumbsUp) gesture = 'THUMBS_UP';
  else if (isGrabbing) gesture = 'GRAB';
  else if (isPinching) gesture = 'PINCH';

  const pinchStrength = Math.max(0, 1 - (distance / THRESHOLDS.PINCH_RELEASE));

  return { gesture, pinchStrength, pinchPoint, raisedFingers };
};
