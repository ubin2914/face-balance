export type SymmetryCategory = '균형 매우 좋음' | '균형 양호' | '약간 차이 있음' | '차이 큼';

export interface DiffMeasurement {
  value: number;
  side: 'left' | 'right';
}

export interface AnalysisResult {
  id: string;
  date: string;
  score: number;
  category: SymmetryCategory;
  eyeDiff: DiffMeasurement;
  lipDiff: DiffMeasurement;
  centerDiff: DiffMeasurement;
}

export function getCategory(score: number): SymmetryCategory {
  if (score >= 90) return '균형 매우 좋음';
  if (score >= 75) return '균형 양호';
  if (score >= 60) return '약간 차이 있음';
  return '차이 큼';
}

export function getCategoryColor(category: SymmetryCategory): string {
  switch (category) {
    case '균형 매우 좋음': return '#10B981';
    case '균형 양호': return '#7C3AED';
    case '약간 차이 있음': return '#F59E0B';
    case '차이 큼': return '#EF4444';
  }
}

export function calculateFromFaceData(raw: string): AnalysisResult {
  const data = JSON.parse(raw);
  const { bounds, landmarks, rollAngle = 0 } = data;

  const faceW = bounds?.width ?? 200;
  const faceH = bounds?.height ?? 260;
  const faceCx = (bounds?.x ?? 0) + faceW / 2;

  // Eye height difference (positive = left eye is lower on screen = right eye higher)
  const lEye = landmarks?.LEFT_EYE;
  const rEye = landmarks?.RIGHT_EYE;
  let eyeRaw = 0;
  let eyeSide: 'left' | 'right' = 'right';
  if (lEye && rEye) {
    eyeRaw = lEye.y - rEye.y;
    eyeSide = eyeRaw > 0 ? 'right' : 'left';
  }
  const eyeVal = parseFloat(Math.min(9.9, (Math.abs(eyeRaw) / faceH) * 14).toFixed(1));

  // Lip corner height difference
  const mLeft = landmarks?.MOUTH_LEFT;
  const mRight = landmarks?.MOUTH_RIGHT;
  let lipRaw = 0;
  let lipSide: 'left' | 'right' = 'right';
  if (mLeft && mRight) {
    lipRaw = mLeft.y - mRight.y;
    lipSide = lipRaw > 0 ? 'right' : 'left';
  }
  const lipVal = parseFloat(Math.min(9.9, (Math.abs(lipRaw) / faceH) * 14).toFixed(1));

  // Center deviation (nose base vs face center)
  const nose = landmarks?.NOSE_BASE;
  let centerRaw = 0;
  let centerSide: 'left' | 'right' = 'right';
  if (nose) {
    centerRaw = nose.x - faceCx;
    centerSide = centerRaw < 0 ? 'left' : 'right';
  }
  const centerVal = parseFloat(Math.min(9.9, (Math.abs(centerRaw) / faceW) * 14).toFixed(1));

  const rollDeduct = Math.abs(rollAngle) * 0.8;
  const rawScore = 100 - eyeVal * 6 - lipVal * 5 - centerVal * 5 - rollDeduct;
  const score = Math.round(Math.max(55, Math.min(97, rawScore)));

  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    score,
    category: getCategory(score),
    eyeDiff: { value: eyeVal, side: eyeSide },
    lipDiff: { value: lipVal, side: lipSide },
    centerDiff: { value: centerVal, side: centerSide },
  };
}

export function generateMockAnalysis(): AnalysisResult {
  const eyeDiff = parseFloat((Math.random() * 3.8 + 0.4).toFixed(1));
  const lipDiff = parseFloat((Math.random() * 2.8 + 0.2).toFixed(1));
  const centerDiff = parseFloat((Math.random() * 2.4 + 0.2).toFixed(1));

  const rawScore = 100 - eyeDiff * 7 - lipDiff * 5 - centerDiff * 5;
  const score = Math.round(Math.max(55, Math.min(97, rawScore)));

  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    score,
    category: getCategory(score),
    eyeDiff: { value: eyeDiff, side: Math.random() > 0.5 ? 'left' : 'right' },
    lipDiff: { value: lipDiff, side: Math.random() > 0.5 ? 'left' : 'right' },
    centerDiff: { value: centerDiff, side: Math.random() > 0.5 ? 'left' : 'right' },
  };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

export function sideName(side: 'left' | 'right'): string {
  return side === 'left' ? '좌측' : '우측';
}
