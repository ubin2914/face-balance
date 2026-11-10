/* Face Balance — true 3D wireframe face mesh (Three.js, no external model)
   Procedural head geometry → triangulated wireframe + glowing landmark points.
   Y-axis drag rotation (±45°) with inertia. Idle breathe / float / point pulse. */
(function () {
  const TWO = Math.PI * 2;
  const DEG = Math.PI / 180;
  function gauss(x, c, s) { const d = (x - c) / s; return Math.exp(-0.5 * d * d); }
  function smoothstep(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  // ---- explicit head silhouette (decoupled from sphere) ----
  // half-width (x) and half-depth (z) as a function of latitude yn (+1 crown .. -1 chin)
  const LUT_W = [[1.00,0.06],[0.93,0.30],[0.82,0.48],[0.66,0.60],[0.44,0.69],[0.14,0.72],[-0.10,0.69],[-0.34,0.58],[-0.55,0.45],[-0.74,0.30],[-0.90,0.13],[-1.0,0.04]];
  const LUT_D = [[1.00,0.07],[0.90,0.42],[0.66,0.70],[0.30,0.84],[0.00,0.86],[-0.34,0.80],[-0.60,0.64],[-0.80,0.42],[-1.0,0.16]];
  function lut(tbl, yn) {
    if (yn >= tbl[0][0]) return tbl[0][1];
    for (let i = 0; i < tbl.length - 1; i++) { const a = tbl[i], b = tbl[i + 1]; if (yn <= a[0] && yn >= b[0]) { const t = (a[0] - yn) / (a[0] - b[0]); return a[1] + (b[1] - a[1]) * t; } }
    return tbl[tbl.length - 1][1];
  }

  function headPoint(yn, phi) {
    let ps = phi; if (ps > Math.PI) ps -= TWO;   // signed, 0 = front (+z)
    const f = Math.max(0, Math.cos(phi));        // front weight
    let Wx = lut(LUT_W, yn), Wz = lut(LUT_D, yn);

    let x = Wx * Math.sin(phi);
    let z = Wz * Math.cos(phi);
    let y = yn * 1.02;
    if (Math.cos(phi) < 0) z *= 0.90;            // flatten back of head

    // facial relief (forward +z), front-weighted
    let dz = 0;
    dz += 0.075 * gauss(yn, 0.22, 0.11) * gauss(ps, 0, 0.7);            // brow
    dz += 0.185 * gauss(yn, 0.00, 0.15) * gauss(ps, 0, 0.20);          // nose ridge
    dz += 0.175 * gauss(yn, -0.14, 0.07) * gauss(ps, 0, 0.14);         // nose tip
    dz += 0.060 * gauss(yn, -0.34, 0.06) * gauss(ps, 0, 0.30);         // lips
    dz += 0.090 * gauss(yn, -0.60, 0.12) * gauss(ps, 0, 0.46);         // chin
    dz += 0.050 * gauss(yn, -0.10, 0.15) * (gauss(ps, 0.58, 0.3) + gauss(ps, -0.58, 0.3)); // cheeks
    dz -= 0.110 * gauss(yn, 0.07, 0.08) * (gauss(ps, 0.40, 0.16) + gauss(ps, -0.40, 0.16)); // eye sockets
    z += dz * f;
    return [x, y, z];
  }

  function isEye(yn, ps, phi) {
    if (Math.cos(phi) < 0.20) return false;
    for (let s = -1; s <= 1; s += 2) {
      const dpx = (ps - 0.40 * s) / 0.20, dpy = (yn - 0.075) / 0.11;
      if (dpx * dpx + dpy * dpy < 1) return true;
    }
    return false;
  }

  function buildHead(Nphi, Nrow) {
    const verts = [];
    const idx = {};
    function push(x, y, z) { const i = verts.length / 3; verts.push(x, y, z); return i; }

    const apexT = push(0, 1.04, 0.02);
    const apexB = push(0, -1.00, 0.08);
    const yTop = 0.92, yBot = -0.90;

    for (let j = 0; j < Nrow; j++) {
      const yn = yTop + (yBot - yTop) * (j / (Nrow - 1));
      for (let i = 0; i < Nphi; i++) {
        const phi = (i / Nphi) * TWO;
        let ps = phi; if (ps > Math.PI) ps -= TWO;
        if (isEye(yn, ps, phi)) { idx[j + '_' + i] = -1; continue; }
        const p = headPoint(yn, phi);
        idx[j + '_' + i] = push(p[0], p[1], p[2]);
      }
    }

    const edgeSet = new Set();
    const edges = [];
    const tris = [];
    function edge(a, b) { if (a == null || b == null || a < 0 || b < 0) return; const k = a < b ? a + ',' + b : b + ',' + a; if (edgeSet.has(k)) return; edgeSet.add(k); edges.push(a, b); }
    function tri(a, b, c) { if (a == null || b == null || c == null || a < 0 || b < 0 || c < 0) return; tris.push(a, b, c); }

    for (let j = 0; j < Nrow; j++) {
      for (let i = 0; i < Nphi; i++) {
        const a = idx[j + '_' + i];
        const aR = idx[j + '_' + ((i + 1) % Nphi)];
        edge(a, aR);                                   // ring
        if (j < Nrow - 1) {
          const b = idx[(j + 1) + '_' + i];
          const bR = idx[(j + 1) + '_' + ((i + 1) % Nphi)];
          edge(a, b);                                  // vertical
          edge(a, bR);                                 // diagonal
          tri(a, b, aR); tri(aR, b, bR);               // surface (open at eye holes)
        }
      }
    }
    // caps
    for (let i = 0; i < Nphi; i++) {
      const ni = (i + 1) % Nphi;
      edge(apexT, idx['0_' + i]); edge(apexB, idx[(Nrow - 1) + '_' + i]);
      tri(apexT, idx['0_' + i], idx['0_' + ni]);
      tri(apexB, idx[(Nrow - 1) + '_' + ni], idx[(Nrow - 1) + '_' + i]);
    }

    return { verts: new Float32Array(verts), edges: new Uint16Array(edges), tris: new Uint16Array(tris), count: verts.length / 3 };
  }

  // ---- shaders ----
  const ptsVert = `
    attribute float aPhase;
    uniform float uTime, uSize, uPR;
    varying float vDim; varying float vP;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      float depth = -mv.z;
      vDim = clamp((5.3 - depth)/(5.3 - 3.1), 0.0, 1.0);
      float pulse = 0.62 + 0.38*sin(uTime*0.9 + aPhase*6.2831);
      vP = pulse;
      gl_PointSize = uSize * uPR * (0.55 + 0.45*pulse) * (3.3/depth);
      gl_Position = projectionMatrix * mv;
    }`;
  const ptsFrag = `
    precision mediump float;
    varying float vDim; varying float vP;
    void main(){
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if(d > 0.5) discard;
      float a = pow(smoothstep(0.5, 0.0, d), 1.5);
      vec3 col = mix(vec3(0.50,0.90,1.0), vec3(1.0), a*0.75);
      float alpha = a * (0.22 + 0.78*vDim) * (0.55 + 0.45*vP);
      gl_FragColor = vec4(col, alpha);
    }`;
  const lineVert = `
    uniform float uTime;
    varying float vDim;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      float depth = -mv.z;
      vDim = clamp((5.3 - depth)/(5.3 - 3.1), 0.0, 1.0);
      gl_Position = projectionMatrix * mv;
    }`;
  const lineFrag = `
    precision mediump float;
    varying float vDim;
    void main(){
      gl_FragColor = vec4(0.42, 0.85, 1.0, 0.06 + 0.27*vDim);
    }`;
  const surfVert = `
    varying vec3 vN; varying vec3 vV;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const surfFrag = `
    precision mediump float;
    varying vec3 vN; varying vec3 vV;
    void main(){
      float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
      vec3 col = mix(vec3(0.13,0.44,0.64), vec3(0.60,0.95,1.0), fres);
      float a = 0.15 + 0.62*fres;
      gl_FragColor = vec4(col, a);
    }`;

  function mount(canvasId, opts) {
    opts = opts || {};
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!canvas || !window.THREE) return;
    const THREE = window.THREE;
    const wrap = canvas.parentElement;
    const allowDrag = opts.drag !== false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserveBuffer });
    const PR = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(PR);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    cam.position.set(0, 0, 4.35);

    const group = new THREE.Group();
    scene.add(group);

    const H = buildHead(44, 54);

    // fresnel-lit surface (reveals nose / brow / eye sockets in 3D)
    const surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute('position', new THREE.BufferAttribute(H.verts, 3));
    surfGeo.setIndex(new THREE.BufferAttribute(H.tris, 1));
    surfGeo.computeVertexNormals();
    const surfMat = new THREE.ShaderMaterial({
      vertexShader: surfVert, fragmentShader: surfFrag,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(surfGeo, surfMat));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(H.verts, 3));
    const phases = new Float32Array(H.count);
    for (let i = 0; i < H.count; i++) phases[i] = Math.random();
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setIndex(new THREE.BufferAttribute(H.edges, 1));

    const lineMat = new THREE.ShaderMaterial({
      vertexShader: lineVert, fragmentShader: lineFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const lines = new THREE.LineSegments(geo, lineMat);
    group.add(lines);

    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(H.verts, 3));
    ptGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const ptMat = new THREE.ShaderMaterial({
      vertexShader: ptsVert, fragmentShader: ptsFrag,
      uniforms: { uTime: { value: 0 }, uSize: { value: 4.0 }, uPR: { value: PR } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const points = new THREE.Points(ptGeo, ptMat);
    group.add(points);

    function resize() {
      const w = canvas.clientWidth || wrap.clientWidth, h = canvas.clientHeight || wrap.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ---- interaction ----
    const LIMIT = 45 * DEG;
    let targetRot = 0, curRot = 0, vel = 0, dragging = false, lastX = 0;
    if (allowDrag) {
      canvas.style.cursor = 'grab';
      canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; vel = 0; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX; lastX = e.clientX;
        const d = dx * 0.0075;
        targetRot = Math.max(-LIMIT, Math.min(LIMIT, targetRot + d));
        vel = d;
      });
      const release = () => { dragging = false; };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      canvas.addEventListener('pointerleave', release);
    }

    const clock = new THREE.Clock();
    function frame() {
      const t = clock.getElapsedTime();
      if (dragging) {
        curRot += (targetRot - curRot) * 0.25;
      } else {
        // inertia → smooth stop, clamped, no recenter
        if (Math.abs(vel) > 0.00002) {
          targetRot = Math.max(-LIMIT, Math.min(LIMIT, targetRot + vel));
          vel *= 0.93;
        }
        curRot += (targetRot - curRot) * 0.12;
      }
      group.rotation.y = curRot;
      // idle: breathe + float
      const breathe = 1.0 + 0.015 * (1 + Math.sin(t * 0.7)) ;
      group.scale.setScalar(breathe);
      group.position.y = Math.sin(t * 0.55) * 0.035;
      lineMat.uniforms.uTime.value = t;
      ptMat.uniforms.uTime.value = t;
      renderer.render(scene, cam);
      requestAnimationFrame(frame);
    }
    frame();
  }

  window.FaceMesh = { mount: mount };
  function autostart() { if (document.getElementById('faceCanvas')) mount('faceCanvas', { drag: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autostart);
  else autostart();
})();
