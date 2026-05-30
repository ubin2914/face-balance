import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import WebView from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

const { width: SW, height: SH } = Dimensions.get('window');

const MEDIAPIPE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name='viewport' content='width=device-width,initial-scale=1,user-scalable=no'>
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}#c{position:absolute;left:0;top:0;width:100%;height:100%}</style>
</head>
<body><canvas id='c'></canvas>
<script>
(function(){
var c=document.getElementById('c'),ctx=c.getContext('2d'),W=0,H=0;
function rsz(){W=window.innerWidth;H=window.innerHeight;c.width=W;c.height=H;}
rsz();window.addEventListener('resize',rsz);

window.phase='idle';
window.ema=null;window.fc=0;
window.scanProgress=0;window.scanActive=false;
window.litSet=new Set();window.scanDoneFlag=false;
window.flashVal=0;window.flashPhase=0;
window.showBg=true;
window.avgScore=0;
window.scoreEye=0;window.scoreMouth=0;window.scoreFace=0;window.scoreCenter=0;

window.resetFace=function(){
  window.ema=null;window.fc=0;
  window.litSet=new Set();window.scanDoneFlag=false;
  window.flashVal=0;window.flashPhase=0;
  window.avgScore=0;window.scoreEye=0;window.scoreMouth=0;window.scoreFace=0;window.scoreCenter=0;
};
window.setPhase=function(p){window.phase=p;};

function rn(t,d){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:t,data:d}));}catch(e){}}

var AL=0.18;
function smooth(p,c){
  if(!p||p.length!==c.length)return c;
  return c.map(function(v,i){return{x:p[i].x+AL*(v.x-p[i].x),y:p[i].y+AL*(v.y-p[i].y),z:v.z};});
}
function calcS(d,f){return Math.round(Math.max(0,Math.min(100,100-d*f)));}

var ROT_AMP=0.08,ROT_SPEED=0.00020;
function getRotAngle(){return ROT_AMP*Math.sin(Date.now()*ROT_SPEED);}
function applyRot(lm,fcx){
  var theta=getRotAngle(),cosT=Math.cos(theta),sinT=Math.sin(theta);
  return lm.map(function(p){
    var dx=p.x-fcx,z=p.z||0;
    return{x:fcx+dx*cosT-z*sinT*0.5,y:p.y,z:dx*sinT+z*cosT};
  });
}

function scanFrac(y,z){return y+(z||0)*0.20;}

function updateFlash(){
  if(window.flashPhase===1){
    window.flashVal=Math.min(1,window.flashVal+0.055);
    if(window.flashVal>=1)window.flashPhase=2;
  }else if(window.flashPhase===2){
    window.flashVal=Math.max(0,window.flashVal-0.016);
    if(window.flashVal<=0)window.flashPhase=0;
  }
}

function dotColorFromScore(s){
  if(s>=90)return'rgba(34,197,94,0.92)';
  if(s>=80)return'rgba(132,204,22,0.92)';
  if(s>=70)return'rgba(234,179,8,0.92)';
  if(s>=60)return'rgba(249,115,22,0.92)';
  return'rgba(239,68,68,0.92)';
}
function dotColorForType(t){
  var s=t==='eye'?window.scoreEye:t==='mouth'?window.scoreMouth:t==='face'?window.scoreFace:window.scoreCenter;
  return dotColorFromScore(s);
}

var scanRaf=null;
window.startScanBeam=function(){
  window.scanActive=true;window.scanDoneFlag=false;
  window.litSet=new Set();window.scanProgress=-0.05;
  var start=null,dur=4500;
  function tick(ts){
    if(!start)start=ts;
    var t=(ts-start)/dur;
    window.scanProgress=t*1.15-0.05;
    if(t<1)scanRaf=requestAnimationFrame(tick);
    else{
      window.scanActive=false;window.scanDoneFlag=true;
      window.flashPhase=1;
      rn('scanDone',null);
    }
  }
  if(scanRaf)cancelAnimationFrame(scanRaf);
  scanRaf=requestAnimationFrame(tick);
};

var busy=false,vid=null,fm=null;

function onResults(r){
  var vw=r.image.width||640,vh=r.image.height||480;
  var scale=W/vw;
  var dw=vw*scale,dh=vh*scale,dx=(W-dw)/2,dy=(H-dh)/2;
  var sx=dw/W,sy=dh/H,ox=dx/W,oy=dy/H;
  function vx(x){return x*sx+ox;}
  function vy(y){return y*sy+oy;}

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#000005';
  ctx.fillRect(0,0,W,H);

  // Camera feed (mirror mode)
  // During idle/aligning: clear mirror. During scanning: slight darkening for glow contrast.
  if(window.showBg){
    ctx.save();ctx.translate(W,0);ctx.scale(-1,1);
    ctx.drawImage(r.image,dx,dy,dw,dh);
    var _sc=window.phase==='scan_start'||window.phase==='scanning'||window.phase==='finishing';
    if(_sc){ctx.fillStyle='rgba(0,0,8,0.32)';ctx.fillRect(0,0,W,H);}
    else if(window.phase==='done'){ctx.fillStyle='rgba(0,0,5,0.22)';ctx.fillRect(0,0,W,H);}
    ctx.restore();
  }

  if(!r.multiFaceLandmarks||!r.multiFaceLandmarks.length){
    window.fc++;if(window.fc%15===0)rn('noface',null);return;
  }

  window.ema=smooth(window.ema,r.multiFaceLandmarks[0]);
  var lm=window.ema;
  var fcx=(lm[234]&&lm[454])?(lm[234].x+lm[454].x)/2:0.5;

  var rlm=applyRot(lm,fcx);
  var tlm=rlm.map(function(l){return{x:vx(l.x),y:vy(l.y),z:l.z};});

  if(window.scanActive){
    lm.forEach(function(p,i){
      if(scanFrac(p.y,p.z||0)<window.scanProgress+0.01)window.litSet.add(i);
    });
  }

  updateFlash();

  var eyeS=calcS(Math.abs((lm[468]?lm[468].y:0.38)-(lm[473]?lm[473].y:0.38)),1800);
  var mthS=calcS(Math.abs((lm[61]?lm[61].y:0.6)-(lm[291]?lm[291].y:0.6)),1800);
  var nX=lm[4]?lm[4].x:0.5;
  var faceS=calcS(Math.abs(Math.abs(nX-(lm[234]?lm[234].x:0.3))-Math.abs((lm[454]?lm[454].x:0.7)-nX)),1500);
  var ctrS=calcS(Math.abs(nX-0.5),1200);
  var tilt=0;
  if(lm[468]&&lm[473])tilt=Math.atan2(lm[473].y-lm[468].y,lm[473].x-lm[468].x)*(180/Math.PI);

  var isScanning=window.phase==='scan_start'||window.phase==='scanning'||window.phase==='finishing';
  var isDone=window.phase==='done';
  var showMesh=isDone;
  var showScanGlow=window.showBg&&isScanning;

  if(!showMesh&&!showScanGlow){
    var sp0={};
    if(lm[10])sp0.forehead={x:1-vx(lm[10].x),y:vy(lm[10].y)};
    window.fc++;
    if(window.fc%3===0){
      var kd0={};
      [4,10,61,152,168,234,291,454,468,473].forEach(function(i){if(lm[i])kd0[i]={x:lm[i].x,y:lm[i].y};});
      rn('landmarks',{lm:kd0,sp:sp0,scores:{eye:eyeS,mouth:mthS,face:faceS,center:ctrS},tilt:tilt});
    }
    return;
  }

  // ── Scan glow: subtle surface light sweep (mirror mode only) ─────────────
  if(showScanGlow&&typeof FACEMESH_TESSELATION!=='undefined'){
    ctx.save();ctx.translate(W,0);ctx.scale(-1,1);
    var GWIN=0.10;
    var effSP=window.phase==='scan_start'?0.05:window.scanProgress;
    FACEMESH_TESSELATION.forEach(function(conn){
      var i=conn[0],j=conn[1];
      var a=tlm[i],b=tlm[j];if(!a||!b)return;
      var fi=lm[i]?scanFrac(lm[i].y,lm[i].z||0):-1;
      var fj=lm[j]?scanFrac(lm[j].y,lm[j].z||0):-1;
      var midF=(fi+fj)/2;
      var dist=midF-effSP;
      if(dist<-0.012||dist>GWIN)return;
      var norm=dist<0?1-Math.abs(dist)/0.012:1-dist/GWIN;
      norm=Math.max(0,Math.min(1,norm));
      var alpha=norm*norm*0.32;
      ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.lineTo(b.x*W,b.y*H);
      ctx.strokeStyle='rgba(0,200,240,'+alpha+')';
      ctx.lineWidth=0.6;
      ctx.stroke();
    });
    ctx.restore();
  }

  // ── Done phase: thin mesh background + score-colored dots ───────────────
  if(showMesh&&typeof FACEMESH_TESSELATION!=='undefined'){
    ctx.save();ctx.translate(W,0);ctx.scale(-1,1);
    var fb=window.flashVal;

    // Tesselation background (very thin, very low opacity)
    FACEMESH_TESSELATION.forEach(function(conn){
      var a=tlm[conn[0]],b=tlm[conn[1]];if(!a||!b)return;
      ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.lineTo(b.x*W,b.y*H);
      ctx.strokeStyle='rgba(220,235,255,'+(0.18+fb*0.08)+')';
      ctx.lineWidth=0.5;
      ctx.stroke();
    });

    // Feature meshes (eyes, eyebrows, lips) — slightly more visible
    var feats=[];
    if(typeof FACEMESH_LEFT_EYE!=='undefined')feats=feats.concat(FACEMESH_LEFT_EYE,FACEMESH_RIGHT_EYE);
    if(typeof FACEMESH_LEFT_EYEBROW!=='undefined')feats=feats.concat(FACEMESH_LEFT_EYEBROW,FACEMESH_RIGHT_EYEBROW);
    if(typeof FACEMESH_LIPS!=='undefined')feats=feats.concat(FACEMESH_LIPS);
    feats.forEach(function(conn){
      var a=tlm[conn[0]],b=tlm[conn[1]];if(!a||!b)return;
      ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.lineTo(b.x*W,b.y*H);
      ctx.strokeStyle='rgba(220,235,255,'+(0.26+fb*0.10)+')';
      ctx.lineWidth=0.6;
      ctx.stroke();
    });

    // Face oval (subtle, not emphasized)
    if(typeof FACEMESH_FACE_OVAL!=='undefined'){
      FACEMESH_FACE_OVAL.forEach(function(conn){
        var a=tlm[conn[0]],b=tlm[conn[1]];if(!a||!b)return;
        ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.lineTo(b.x*W,b.y*H);
        ctx.strokeStyle='rgba(220,235,255,'+(0.28+fb*0.10)+')';
        ctx.lineWidth=0.6;
        ctx.stroke();
      });
    }

    // Dots: key landmarks, color per measurement score
    var KM=[[10,'center'],[9,'center'],[4,'center'],[164,'center'],[0,'mouth'],[17,'mouth'],[152,'center'],[468,'eye'],[473,'eye'],[33,'eye'],[133,'eye'],[362,'eye'],[263,'eye'],[61,'mouth'],[291,'mouth'],[234,'face'],[454,'face']];
    KM.forEach(function(e){
      var p=tlm[e[0]];if(!p)return;
      ctx.beginPath();ctx.arc(p.x*W,p.y*H,2.5,0,Math.PI*2);
      ctx.fillStyle=dotColorForType(e[1]);
      ctx.fill();
    });

    ctx.restore();
  }

  // Flash overlay — outside mesh block, plays on camera feed during finishing
  if(window.flashVal>0){
    ctx.fillStyle='rgba(0,200,255,'+(window.flashVal*0.14)+')';
    ctx.fillRect(0,0,W,H);
  }

  var sp={};
  if(lm[10]) sp.forehead={x:1-vx(lm[10].x),y:vy(lm[10].y)};
  if(lm[468])sp.iris_R  ={x:1-vx(lm[468].x),y:vy(lm[468].y)};
  if(lm[473])sp.iris_L  ={x:1-vx(lm[473].x),y:vy(lm[473].y)};
  if(lm[61]) sp.mouthR  ={x:1-vx(lm[61].x), y:vy(lm[61].y)};
  if(lm[291])sp.mouthL  ={x:1-vx(lm[291].x),y:vy(lm[291].y)};
  if(lm[454])sp.jawL    ={x:1-vx(lm[454].x),y:vy(lm[454].y)};

  window.fc++;
  if(window.fc%3===0){
    var kd={};
    [4,10,61,152,168,234,291,454,468,473].forEach(function(i){if(lm[i])kd[i]={x:lm[i].x,y:lm[i].y};});
    rn('landmarks',{lm:kd,sp:sp,scores:{eye:eyeS,mouth:mthS,face:faceS,center:ctrS},tilt:tilt});
  }
}

function startCamera(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false})
  .then(function(s){
    vid=document.createElement('video');vid.srcObject=s;vid.autoplay=true;vid.playsInline=true;vid.muted=true;
    return vid.play();
  })
  .then(function(){
    rn('ready',null);
    function loop(){
      if(!busy&&vid&&vid.readyState>=2){busy=true;fm.send({image:vid}).then(function(){busy=false;}).catch(function(){busy=false;});}
      requestAnimationFrame(loop);
    }
    loop();
  })
  .catch(function(e){rn('error',{message:e.message});});
}

function loadScript(src,cb){
  var s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';s.onload=cb;
  s.onerror=function(){rn('error',{message:'로드실패:'+src});};document.head.appendChild(s);
}
function init(){
  loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js',function(){
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js',function(){
      try{
        fm=new FaceMesh({locateFile:function(f){return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/'+f;}});
        fm.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
        fm.onResults(onResults);startCamera();
      }catch(e){rn('error',{message:e.message});}
    });
  });
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
</script></body></html>`;

// ─────────────────────────────────────────────────────────
type Mode = 'mirror' | 'line';
type ScanPhase = 'idle' | 'aligning' | 'scan_start' | 'scanning' | 'finishing' | 'done';
type P = { x: number; y: number };
type SP = { forehead?: P; iris_L?: P; iris_R?: P; mouthL?: P; mouthR?: P; jawL?: P };
type Scores = { eye: number; mouth: number; face: number; center: number };

function scoreColor(v: number) {
  if (v >= 90) return '#22C55E';
  if (v >= 80) return '#84CC16';
  if (v >= 70) return '#EAB308';
  if (v >= 60) return '#F97316';
  return '#EF4444';
}
function emaValue(prev: number, next: number, alpha = 0.25) {
  return Math.round(prev + alpha * (next - prev));
}
function getHint(s: Scores, tilt: number) {
  if (Math.abs(tilt) > 5) return `고개가 ${tilt > 0 ? '왼쪽' : '오른쪽'}으로 ${Math.abs(tilt).toFixed(1)}° 기울었어요`;
  if (s.mouth  < 70) return '입꼬리를 조금 더 올려보세요!';
  if (s.center < 70) return '얼굴을 정중앙에 맞춰보세요';
  if (s.eye    < 75) return '눈 높이 차이를 줄여보세요';
  if (s.face   < 75) return '윤곽 비대칭이 있어요';
  return '균형이 잘 맞아요!';
}

const PHASE_MSG: Record<ScanPhase, string> = {
  idle:       '프레임 안에 얼굴을 맞춰주세요',
  aligning:   '움직이지 말고 정면을 유지해주세요',
  scan_start: '스캔을 시작합니다',
  scanning:   '스캔 중...',
  finishing:  '스캔을 마무리합니다',
  done:       '분석이 완료되었습니다',
};

const TIPS = [
  { icon: '☀️', text: '밝은 곳에서 사용해주세요' },
  { icon: '👓', text: '안경, 모자는 벗어주세요' },
  { icon: '😐', text: '표정은 자연스럽게 유지해주세요' },
  { icon: '📱', text: '기기를 고정하면 더 정확해요' },
];

const OW = SW * 0.72, OH = SH * 0.52;
const OX = SW / 2, OY = SH * 0.40;
const OL = OX - OW / 2, OT = OY - OH / 2;
const BS = 24;

function AlignFrame() {
  const ovalPath = `M0,0 L${SW},0 L${SW},${SH} L0,${SH} Z M${OX},${OY} m${-OW/2},0 a${OW/2},${OH/2} 0 1,0 ${OW},0 a${OW/2},${OH/2} 0 1,0 ${-OW},0`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
        <Path d={ovalPath} fill="rgba(0,0,0,0.45)" fillRule="evenodd"/>
        <Ellipse cx={OX} cy={OY} rx={OW/2} ry={OH/2}
          fill="none" stroke="rgba(0,220,255,0.65)" strokeWidth={1.4}/>
        <Path d={`M${OL},${OT+BS} L${OL},${OT} L${OL+BS},${OT}`} stroke="rgba(0,220,255,0.85)" strokeWidth={2.0} fill="none" strokeLinecap="square"/>
        <Path d={`M${OL+OW-BS},${OT} L${OL+OW},${OT} L${OL+OW},${OT+BS}`} stroke="rgba(0,220,255,0.85)" strokeWidth={2.0} fill="none" strokeLinecap="square"/>
        <Path d={`M${OL},${OT+OH-BS} L${OL},${OT+OH} L${OL+BS},${OT+OH}`} stroke="rgba(0,220,255,0.85)" strokeWidth={2.0} fill="none" strokeLinecap="square"/>
        <Path d={`M${OL+OW-BS},${OT+OH} L${OL+OW},${OT+OH} L${OL+OW},${OT+OH-BS}`} stroke="rgba(0,220,255,0.85)" strokeWidth={2.0} fill="none" strokeLinecap="square"/>
      </Svg>
    </View>
  );
}

const GRID_CELL = 38;

function GridOverlay() {
  const lnC = 'rgba(0,200,255,0.30)';
  const cC  = 'rgba(0,220,255,0.55)';
  const vxs = Array.from({ length: Math.floor((SW - 1) / GRID_CELL) }, (_, i) => (i + 1) * GRID_CELL);
  const hys = Array.from({ length: Math.floor((SH - 1) / GRID_CELL) }, (_, i) => (i + 1) * GRID_CELL);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
        {vxs.map(x => <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={SH} stroke={lnC} strokeWidth={0.5}/>)}
        {hys.map(y => <Line key={`h${y}`} x1={0} y1={y} x2={SW} y2={y} stroke={lnC} strokeWidth={0.5}/>)}
        <Line x1={0}  y1={OY} x2={SW} y2={OY} stroke={cC} strokeWidth={1.1}/>
        <Line x1={OX} y1={0}  x2={OX} y2={SH} stroke={cC} strokeWidth={1.1}/>
      </Svg>
    </View>
  );
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebViewType>(null);
  const lastLm = useRef<any>(null);
  const smoothedScores = useRef<Scores>({ eye: 0, mouth: 0, face: 0, center: 0 });
  const tiltRef = useRef(0);
  const phaseRef = useRef<ScanPhase>('idle');
  const faceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alignTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceOutWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneScores = useRef<Scores | null>(null);

  const [mode,         setMode]         = useState<Mode>('mirror');
  const [status,       setStatus]       = useState<'loading'|'ready'|'error'>('loading');
  const [errMsg,       setErrMsg]       = useState('');
  const [hasFace,      setHasFace]      = useState(false);
  const [scores,       setScores]       = useState<Scores|null>(null);
  const [sp,           setSp]           = useState<SP>({});
  const [tilt,         setTilt]         = useState(0);
  const [saved,        setSaved]        = useState(false);
  const [scanPhase,    setScanPhase]    = useState<ScanPhase>('idle');
  const [tipIdx,       setTipIdx]       = useState(0);
  const [alignSeconds, setAlignSeconds] = useState(2);
  const [scanWarning,  setScanWarning]  = useState(false);

  const msgOp     = useRef(new Animated.Value(1)).current;
  const savePopOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // 2-second countdown during aligning phase
  useEffect(() => {
    if (scanPhase === 'aligning') {
      setAlignSeconds(2);
      const start = Date.now();
      const id = setInterval(() => {
        const remaining = Math.max(0, 2 - Math.floor((Date.now() - start) / 1000));
        setAlignSeconds(remaining);
      }, 100);
      alignTimerRef.current = id;
      return () => clearInterval(id);
    }
    return undefined;
  }, [scanPhase]);

  const setPhase = useCallback((p: ScanPhase) => {
    phaseRef.current = p;
    msgOp.setValue(0);
    Animated.timing(msgOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setScanPhase(p);
    webRef.current?.injectJavaScript(`window.setPhase&&window.setPhase('${p}');true;`);
  }, []);

  const startScanSequence = useCallback(() => {
    setPhase('aligning');
    setTimeout(() => {
      setPhase('scan_start');
      setTimeout(() => {
        setPhase('scanning');
        webRef.current?.injectJavaScript('window.startScanBeam&&window.startScanBeam();true;');
      }, 1400);
    }, 2200);
  }, [setPhase]);

  const showSavedPopup = () => {
    setSaved(true);
    savePopOp.setValue(0);
    Animated.sequence([
      Animated.timing(savePopOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(savePopOp, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    webRef.current?.injectJavaScript(`window.showBg=${m==='mirror'};true;`);
  };

  const remap = () => {
    if (faceTimer.current) clearTimeout(faceTimer.current);
    if (alignTimerRef.current) clearInterval(alignTimerRef.current);
    if (faceOutTimerRef.current) { clearTimeout(faceOutTimerRef.current); faceOutTimerRef.current = null; }
    if (faceOutWarnTimerRef.current) { clearTimeout(faceOutWarnTimerRef.current); faceOutWarnTimerRef.current = null; }
    setScanWarning(false);
    doneScores.current = null;
    webRef.current?.injectJavaScript('window.resetFace&&window.resetFace();true;');
    setHasFace(false); setScores(null); setSp({});
    setPhase('idle');
  };

  const handleMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        setStatus('ready');
      } else if (msg.type === 'landmarks') {
        lastLm.current = msg.data.lm;
        const raw = msg.data.scores as Scores;
        const prev = smoothedScores.current;
        const smoothed: Scores = {
          eye:    emaValue(prev.eye,    raw.eye),
          mouth:  emaValue(prev.mouth,  raw.mouth),
          face:   emaValue(prev.face,   raw.face),
          center: emaValue(prev.center, raw.center),
        };
        smoothedScores.current = smoothed;
        setScores(smoothed);
        if (phaseRef.current === 'done') {
          webRef.current?.injectJavaScript(`window.scoreEye=${smoothed.eye};window.scoreMouth=${smoothed.mouth};window.scoreFace=${smoothed.face};window.scoreCenter=${smoothed.center};true;`);
        }
        setSp(msg.data.sp ?? {});
        tiltRef.current += 0.2 * ((msg.data.tilt ?? 0) - tiltRef.current);
        setTilt(parseFloat(tiltRef.current.toFixed(1)));

        if (!hasFace) {
          setHasFace(true);
          if (faceOutTimerRef.current) { clearTimeout(faceOutTimerRef.current); faceOutTimerRef.current = null; }
          if (faceOutWarnTimerRef.current) { clearTimeout(faceOutWarnTimerRef.current); faceOutWarnTimerRef.current = null; }
          setScanWarning(false);
          if (phaseRef.current === 'idle') {
            faceTimer.current = setTimeout(startScanSequence, 600);
          }
        }
      } else if (msg.type === 'noface') {
        setHasFace(false); setScores(null);
        const scanning = phaseRef.current==='scan_start'||phaseRef.current==='scanning'||phaseRef.current==='finishing';
        if (phaseRef.current !== 'idle' && phaseRef.current !== 'done') {
          if (faceTimer.current) clearTimeout(faceTimer.current);
          if (scanning) {
            if (!faceOutTimerRef.current) {
              faceOutTimerRef.current = setTimeout(() => {
                setScanWarning(true);
                faceOutWarnTimerRef.current = setTimeout(() => {
                  setScanWarning(false);
                  faceOutTimerRef.current = null;
                  faceOutWarnTimerRef.current = null;
                  if (alignTimerRef.current) clearInterval(alignTimerRef.current);
                  webRef.current?.injectJavaScript('window.resetFace&&window.resetFace();true;');
                  setScores(null); setSp({});
                  setPhase('idle');
                }, 1000);
              }, 1000);
            }
          } else {
            setPhase('idle');
          }
        }
      } else if (msg.type === 'scanDone') {
        setPhase('finishing');
        setTimeout(() => {
          setPhase('done');
          const s = smoothedScores.current;
          const avg = Math.round((s.face + s.eye + s.mouth + s.center) / 4);
          webRef.current?.injectJavaScript(`window.scanDoneFlag=true;window.avgScore=${avg};window.scoreEye=${s.eye};window.scoreMouth=${s.mouth};window.scoreFace=${s.face};window.scoreCenter=${s.center};true;`);
        }, 1800);
      } else if (msg.type === 'error') {
        setStatus('error'); setErrMsg(msg.data?.message ?? '오류');
      }
    } catch {}
  }, [hasFace, setPhase, startScanSequence]);

  const handleSave = useCallback(() => {
    const lm = lastLm.current; if (!lm) return;
    const lE = lm[468]?{x:lm[468].x*SW,y:lm[468].y*SH}:undefined;
    const rE = lm[473]?{x:lm[473].x*SW,y:lm[473].y*SH}:undefined;
    const mL = lm[61] ?{x:lm[61].x*SW, y:lm[61].y*SH} :undefined;
    const mR = lm[291]?{x:lm[291].x*SW,y:lm[291].y*SH}:undefined;
    const ns = lm[168]?{x:lm[168].x*SW,y:lm[168].y*SH}:undefined;
    const fX=(lm[234]?.x??0.2)*SW, fY=(lm[10]?.y??0.15)*SH;
    const fW=((lm[454]?.x??0.8)-(lm[234]?.x??0.2))*SW;
    const fH=((lm[152]?.y??0.85)-(lm[10]?.y??0.15))*SH;
    let roll=0;
    if(lm[468]&&lm[473])roll=Math.atan2(lm[473].y-lm[468].y,lm[473].x-lm[468].x)*(180/Math.PI);
    showSavedPopup();
    router.push({ pathname:'/analysis', params:{ faceData:JSON.stringify({
      bounds:{x:fX,y:fY,width:fW,height:fH},
      landmarks:{LEFT_EYE:lE,RIGHT_EYE:rE,MOUTH_LEFT:mL,MOUTH_RIGHT:mR,NOSE_BASE:ns},
      rollAngle:roll,
    })}});
  }, []);

  const displayScores = scores;
  const avg = displayScores && scanPhase === 'done'
    ? Math.round((displayScores.face+displayScores.eye+displayScores.mouth+displayScores.center)/4)
    : null;
  const labelAt = (pos?: P, ox=0, oy=0) => pos ? ({ left: pos.x*SW+ox, top: pos.y*SH+oy }) : null;
  const tip = TIPS[tipIdx];
  const tiltAbs = Math.abs(tilt);
  const tiltColor = tiltAbs < 2 ? '#00D4FF' : tiltAbs < 5 ? '#EAB308' : '#F97316';
  const showScores = scanPhase === 'done' && hasFace && displayScores;

  return (
    <View style={s.root}>
      <WebView ref={webRef}
        source={{ html: MEDIAPIPE_HTML, baseUrl: 'http://localhost/' }}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']} javaScriptEnabled allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false} mediaCapturePermissionGrantType="grant"
        onMessage={handleMessage} scrollEnabled={false} bounces={false} allowsLinkPreview={false}
      />

      {status==='loading' && <View style={s.loadWrap}><Text style={s.loadTxt}>MediaPipe 로딩 중...</Text></View>}
      {status==='error'   && <View style={s.loadWrap}><Text style={[s.loadTxt,{color:'#F97316'}]}>오류: {errMsg}</Text></View>}

      {/* 고정 가이드 그리드 - 항상 표시 */}
      <GridOverlay/>

      {/* 정렬 가이드: idle + aligning 모두 표시 */}
      {(scanPhase === 'idle' || scanPhase === 'aligning') && <AlignFrame/>}

      {/* 프레임 이탈 경고 */}
      {scanWarning && (
        <View style={s.frameWarnWrap} pointerEvents="none">
          <Text style={s.frameWarnTxt}>⚠ 프레임에 얼굴을 유지해주세요</Text>
        </View>
      )}

      {/* 2초 카운트다운 */}
      {scanPhase === 'aligning' && (
        <View style={s.countWrap} pointerEvents="none">
          <Text style={s.countTxt}>{alignSeconds}</Text>
        </View>
      )}

      {/* 플로팅 점수 레이블 */}
      {showScores && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {labelAt(sp.forehead,-30,-48) && <FLabel style={labelAt(sp.forehead,-30,-48)!} pct={displayScores!.center} name="중심선"/>}
          {labelAt(sp.iris_R, 10,-8)   && <FLabel style={labelAt(sp.iris_R,10,-8)!}     pct={displayScores!.eye}    name="눈 대칭"/>}
          {labelAt(sp.jawL,-72,-10)     && <FLabel style={labelAt(sp.jawL,-72,-10)!}      pct={displayScores!.face}   name="윤곽선"/>}
          {labelAt(sp.mouthL,-30,14)    && <FLabel style={labelAt(sp.mouthL,-30,14)!}     pct={displayScores!.mouth}  name="입꼬리"/>}
        </View>
      )}

      {showScores && (
        <View style={s.tiltWrap} pointerEvents="none">
          <TiltBar tilt={tilt} color={tiltColor}/>
          <Text style={[s.tiltVal,{color:tiltColor}]}>
            {tilt > 0 ? '←' : tilt < 0 ? '→' : '—'} {tiltAbs.toFixed(1)}°
          </Text>
        </View>
      )}

      {saved && (
        <Animated.View style={[s.savedPop,{opacity:savePopOp}]} pointerEvents="none">
          <Text style={s.savedTxt}>기록되었습니다</Text>
        </Animated.View>
      )}

      {/* 상단 바 */}
      <View style={[s.topBar,{paddingTop:insets.top+6}]}>
        <TouchableOpacity style={s.iconBtn} onPress={()=>router.back()}>
          <Text style={s.iconTxt}>✕</Text>
        </TouchableOpacity>
        <View style={s.tabs}>
          {(['mirror','line'] as Mode[]).map(m=>(
            <TouchableOpacity key={m} style={[s.tab,mode===m&&s.tabOn]} onPress={()=>switchMode(m)}>
              <Text style={[s.tabTxt,mode===m&&s.tabTxtOn]}>{m==='mirror'?'미러 모드':'라인 모드'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={remap}>
          <Text style={[s.iconTxt,{fontSize:19}]}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* 상태 메시지 */}
      <View style={s.msgWrap} pointerEvents="none">
        <Animated.View style={[s.msgBox, {opacity:msgOp}, scanPhase==='done'&&s.msgBoxDone]}>
          {(scanPhase==='scanning'||scanPhase==='finishing') && <View style={s.scanDot}/>}
          <Text style={[s.msgTxt, scanPhase==='done'&&s.msgTxtDone]}>
            {PHASE_MSG[scanPhase]}
          </Text>
        </Animated.View>
      </View>

      {/* 하단 패널 */}
      <View style={[s.panel,{paddingBottom:insets.bottom+6}]}>
        <View style={s.tipRow}>
          <Text style={s.tipIcon}>{tip.icon}</Text>
          <Text style={s.tipTxt}>{tip.text}</Text>
        </View>
        <View style={s.gaugeRow}>
          <Gauge label="중심선" score={displayScores?.center??0} active={scanPhase==='done'&&hasFace} icon="center"/>
          <Gauge label="윤곽"   score={displayScores?.face??0}   active={scanPhase==='done'&&hasFace} icon="face"/>
          <Gauge label="눈"     score={displayScores?.eye??0}    active={scanPhase==='done'&&hasFace} icon="eye"/>
          <Gauge label="입꼬리" score={displayScores?.mouth??0}  active={scanPhase==='done'&&hasFace} icon="mouth"/>
        </View>
        <Text style={s.hint}>
          {scanPhase==='done'&&scores ? getHint(scores,tilt) : ' '}
        </Text>
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={()=>router.push('/(tabs)')}>
            <BarChartIcon/>
          </TouchableOpacity>
          <View style={s.barTrack}>
            {avg!==null && <View style={[s.barFill,{width:`${avg}%` as any,backgroundColor:scoreColor(avg)}]}/>}
            {avg !== null && <Text style={s.barPct}>{avg}%</Text>}
          </View>
          <TouchableOpacity style={s.barBtn} onPress={handleSave} disabled={scanPhase!=='done'||!hasFace}>
            <SaveIcon active={scanPhase==='done'&&hasFace}/>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TiltBar({ tilt, color }: { tilt: number; color: string }) {
  const offset = (Math.max(-10,Math.min(10,tilt)) / 10) * 40;
  return (
    <View style={tb.wrap}>
      <View style={tb.track}>
        <View style={tb.center}/>
        <View style={[tb.indicator,{transform:[{translateX:offset}],backgroundColor:color}]}/>
      </View>
    </View>
  );
}
const tb = StyleSheet.create({
  wrap:      { alignItems:'center' },
  track:     { width:100,height:4,backgroundColor:'rgba(0,200,255,0.12)',borderRadius:2,position:'relative',alignItems:'center',justifyContent:'center' },
  center:    { width:2,height:8,backgroundColor:'rgba(0,200,255,0.4)',borderRadius:1,position:'absolute' },
  indicator: { width:10,height:10,borderRadius:5,position:'absolute' },
});

function FLabel({ style, pct, name }: { style:{left:number;top:number}; pct:number; name:string }) {
  const color = scoreColor(pct);
  return (
    <View style={[fl.wrap,style]}>
      <Text style={[fl.pct,{color}]}>{pct}%</Text>
      <Text style={fl.name}>{name}</Text>
    </View>
  );
}
const fl = StyleSheet.create({
  wrap: { position:'absolute',alignItems:'center',minWidth:56 },
  pct:  { fontSize:15,fontWeight:'700',letterSpacing:0.5 },
  name: { fontSize:9,color:'rgba(180,240,255,0.6)',fontWeight:'600',marginTop:1 },
});

function Gauge({ label, score, active, icon }: { label:string; score:number; active:boolean; icon:string }) {
  const R=28, C=2*Math.PI*R;
  const color = active ? scoreColor(score) : 'rgba(0,180,255,0.18)';
  return (
    <View style={g.wrap}>
      <Text style={g.label}>{label}</Text>
      <View style={g.circ}>
        <Svg width={68} height={68}>
          <Circle cx={34} cy={34} r={R} stroke="rgba(0,180,255,0.08)" strokeWidth={2.5} fill="none"/>
          <Circle cx={34} cy={34} r={R} stroke={color} strokeWidth={2.5} fill="none"
            strokeDasharray={`${C}`} strokeDashoffset={C*(1-(active?score:0)/100)}
            strokeLinecap="round" transform={`rotate(-90 34 34)`}/>
        </Svg>
        <View style={g.inner}>
          <Text style={[g.pct,{color}]}>{active?score:'--'}%</Text>
          <Text style={g.sub}>균형</Text>
        </View>
      </View>
      <GaugeIcon type={icon} color={active?color:'rgba(0,180,255,0.25)'}/>
    </View>
  );
}
const g = StyleSheet.create({
  wrap:  { flex:1,alignItems:'center',gap:3 },
  label: { color:'rgba(0,200,255,0.5)',fontSize:10,fontWeight:'600' },
  circ:  { width:68,height:68,position:'relative' },
  inner: { position:'absolute',top:0,left:0,right:0,bottom:0,alignItems:'center',justifyContent:'center' },
  pct:   { fontSize:13,fontWeight:'700' },
  sub:   { color:'rgba(0,200,255,0.35)',fontSize:7,marginTop:1 },
});
function GaugeIcon({ type, color }: { type:string; color:string }) {
  const sz=16;
  if(type==='center')return <Svg width={sz} height={sz} viewBox="0 0 16 16"><Line x1={8} y1={0} x2={8} y2={16} stroke={color} strokeWidth={1.4} strokeDasharray="2,2"/><Line x1={0} y1={8} x2={16} y2={8} stroke={color} strokeWidth={0.8} opacity={0.5}/></Svg>;
  if(type==='face')  return <Svg width={sz} height={sz} viewBox="0 0 16 16"><Ellipse cx={8} cy={8} rx={6} ry={7.2} stroke={color} strokeWidth={1.3} fill="none"/></Svg>;
  if(type==='eye')   return <Svg width={sz+2} height={sz-4} viewBox="0 0 18 12"><Path d="M1 6 Q9 0 17 6 Q9 12 1 6Z" stroke={color} strokeWidth={1.2} fill="none"/><Circle cx={9} cy={6} r={2.2} fill={color}/></Svg>;
  return <Svg width={sz+2} height={sz-6} viewBox="0 0 18 10"><Path d="M2 2 Q9 10 16 2" stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round"/></Svg>;
}

function BarChartIcon() {
  return <Svg width={22} height={18} viewBox="0 0 22 18">
    <Rect x={0}   y={9} width={5} height={9}  rx={1} fill="rgba(0,200,255,0.75)"/>
    <Rect x={8.5} y={4} width={5} height={14} rx={1} fill="rgba(0,200,255,0.9)"/>
    <Rect x={17}  y={0} width={5} height={18} rx={1} fill="rgba(0,200,255,0.7)"/>
  </Svg>;
}
function SaveIcon({ active }: { active: boolean }) {
  const c = active ? 'rgba(0,220,255,0.9)' : 'rgba(0,180,255,0.25)';
  return <Svg width={22} height={22} viewBox="0 0 22 22">
    <Circle cx={11} cy={11} r={9} stroke={c} strokeWidth={1.5} fill="none"/>
    <Circle cx={11} cy={11} r={3} fill={c}/>
    <Line x1={11} y1={2}  x2={11} y2={5}  stroke={c} strokeWidth={1.5}/>
    <Line x1={11} y1={17} x2={11} y2={20} stroke={c} strokeWidth={1.5}/>
    <Line x1={2}  y1={11} x2={5}  y2={11} stroke={c} strokeWidth={1.5}/>
    <Line x1={17} y1={11} x2={20} y2={11} stroke={c} strokeWidth={1.5}/>
  </Svg>;
}

const s = StyleSheet.create({
  root:    { flex:1,backgroundColor:'#000' },
  loadWrap:{ ...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,5,0.88)',alignItems:'center',justifyContent:'center' },
  loadTxt: { color:'rgba(0,220,255,0.8)',fontSize:13 },

  countWrap: { position:'absolute',top:'22%',alignSelf:'center',alignItems:'center' },
  countTxt:  { color:'rgba(0,220,255,0.90)',fontSize:52,fontWeight:'700',letterSpacing:2 },

  msgWrap: { position:'absolute',top:'11%',left:0,right:0,alignItems:'center' },
  msgBox:  { flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(0,0,10,0.72)',borderRadius:20,paddingHorizontal:18,paddingVertical:9,borderWidth:1,borderColor:'rgba(0,200,255,0.3)' },
  msgBoxDone: { borderColor:'rgba(34,197,94,0.4)' },
  msgTxt:  { color:'rgba(180,240,255,0.95)',fontSize:13,fontWeight:'600',letterSpacing:0.3 },
  msgTxtDone: { color:'#86EFAC' },
  scanDot: { width:7,height:7,borderRadius:3.5,backgroundColor:'#00D4FF' },

  tiltWrap: { position:'absolute',top:'17%',alignSelf:'center',alignItems:'center',gap:5 },
  tiltVal:  { fontSize:11,fontWeight:'700',letterSpacing:0.5 },

  topBar:  { position:'absolute',top:0,left:0,right:0,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8 },
  iconBtn: { width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,10,0.6)',alignItems:'center',justifyContent:'center',borderWidth:0.5,borderColor:'rgba(0,200,255,0.25)' },
  iconTxt: { color:'rgba(0,220,255,0.9)',fontSize:14,fontWeight:'600' },
  tabs:    { flex:1,flexDirection:'row',backgroundColor:'rgba(0,0,10,0.65)',borderRadius:20,padding:3,borderWidth:0.5,borderColor:'rgba(0,200,255,0.18)' },
  tab:     { flex:1,paddingVertical:6,borderRadius:17,alignItems:'center' },
  tabOn:   { backgroundColor:'rgba(0,200,255,0.14)' },
  tabTxt:  { color:'rgba(0,180,255,0.38)',fontSize:12,fontWeight:'600' },
  tabTxtOn:{ color:'rgba(0,220,255,0.95)' },

  panel:   { position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,8,0.88)',paddingTop:8,paddingHorizontal:14,gap:5 },
  tipRow:  { flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:4,borderBottomWidth:0.5,borderBottomColor:'rgba(0,200,255,0.08)' },
  tipIcon: { fontSize:12 },
  tipTxt:  { color:'rgba(0,200,255,0.45)',fontSize:11 },
  gaugeRow:{ flexDirection:'row',justifyContent:'space-between' },
  hint:    { textAlign:'center',color:'rgba(0,200,255,0.5)',fontSize:11,paddingBottom:2 },
  bar:     { flexDirection:'row',alignItems:'center',gap:12,paddingBottom:2 },
  barBtn:  { width:36,height:36,alignItems:'center',justifyContent:'center' },
  barTrack:{ flex:1,height:5,borderRadius:3,backgroundColor:'rgba(0,180,255,0.12)',overflow:'hidden',justifyContent:'center' },
  barFill: { height:'100%',borderRadius:3,position:'absolute',left:0 },
  barPct:  { color:'rgba(0,200,255,0.55)',fontSize:9,fontWeight:'700',textAlign:'center',zIndex:1 },

  savedPop:{ position:'absolute',top:'45%',alignSelf:'center',backgroundColor:'rgba(0,0,10,0.85)',borderRadius:14,paddingHorizontal:24,paddingVertical:14,borderWidth:1,borderColor:'rgba(0,200,255,0.2)' },
  savedTxt:{ color:'rgba(0,220,255,0.95)',fontSize:14,fontWeight:'600' },

  frameWarnWrap:{ position:'absolute',bottom:175,alignSelf:'center',backgroundColor:'rgba(249,115,22,0.13)',borderRadius:12,paddingHorizontal:20,paddingVertical:10,borderWidth:1,borderColor:'rgba(249,115,22,0.45)' },
  frameWarnTxt:{ color:'#F97316',fontSize:13,fontWeight:'700' },
});
