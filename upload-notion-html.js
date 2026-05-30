const https = require('https');
const fs = require('fs');

const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = '370291a09b41807da356f7ff20c77a42';
const RAW = 'https://raw.githubusercontent.com/ubin2914/face-balance/master';

function txt(content, opts = {}) {
  const o = { type: 'text', text: { content: String(content) } };
  if (opts.bold) o.annotations = { bold: true };
  if (opts.code) o.annotations = { code: true };
  if (opts.italic) o.annotations = { italic: true };
  return o;
}
function rt(...parts) { return parts.flat().filter(Boolean); }
function h1(t) { return { type: 'heading_1', heading_1: { rich_text: [txt(t)] } }; }
function h2(t) { return { type: 'heading_2', heading_2: { rich_text: [txt(t)] } }; }
function h3(t) { return { type: 'heading_3', heading_3: { rich_text: [txt(t)] } }; }
function para(...r) { return { type: 'paragraph', paragraph: { rich_text: rt(...r) } }; }
function divider() { return { type: 'divider', divider: {} }; }
function bullet(t) { return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [txt(t)] } }; }
function code(content) { return { type: 'code', code: { rich_text: [txt(content)], language: 'javascript' } }; }
function callout(emoji, ...r) { return { type: 'callout', callout: { icon: { type: 'emoji', emoji }, rich_text: rt(...r) } }; }
function image(path) { return { type: 'image', image: { type: 'external', external: { url: `${RAW}/${path}` } } }; }

function buildBlocks() {
  const blocks = [];

  // ── Cover ──
  blocks.push(h1('Face Balance — AI 협업 개발 포트폴리오'));
  blocks.push(para(txt('얼굴 좌우 균형을 실시간으로 측정하고 셀프 트레이닝하는 iOS 앱', { italic: true })));
  blocks.push(para(
    txt('플랫폼: ', { bold: true }), txt('iOS (React Native / Expo SDK 54)  '),
    txt('핵심 기능: ', { bold: true }), txt('MediaPipe Face Mesh 478점 실시간 얼굴 대칭 측정  '),
    txt('개발 기간: ', { bold: true }), txt('1일 (Claude와 단일 세션)  '),
    txt('결과: ', { bold: true }), txt('실기기 빌드 성공, 실제 동작 확인')
  ));
  blocks.push(divider());

  // ── Tech Stack ──
  blocks.push(h2('기술 스택'));
  for (const t of [
    'Expo SDK 54 / expo-router / TypeScript',
    'React Native WebView — MediaPipe를 WKWebView 내부에서 실행',
    'MediaPipe Face Mesh 0.4 (478 랜드마크, CDN 로딩)',
    'React Native Animated API — 스캔 빔 / 저장 토스트 애니메이션',
    'react-native-svg — SVG 원형 게이지 / 하단 아이콘',
    'AsyncStorage — 로컬 기록 저장',
    'EMA Smoothing α=0.18',
    'requestAnimationFrame',
  ]) blocks.push(bullet(t));
  blocks.push(divider());

  // ── Architecture ──
  blocks.push(h2('핵심 구조'));
  blocks.push(h3('WebView Layer (Canvas)'));
  for (const t of [
    'MediaPipe FaceMesh 로딩 및 실행',
    '카메라 피드 렌더링 (mirror flip)',
    'FACEMESH_TESSELATION 와이어프레임',
    'Scan glow 애니메이션 (scanFrac)',
    'EMA smoothing (α=0.18)',
    'Y축 회전 (ROT_AMP=0.08, ±4.6°)',
    'Flash overlay (완료 시 플래시)',
    '17개 키 포인트 점수별 색상 렌더링',
  ]) blocks.push(bullet(t));

  blocks.push(h3('React Native Layer'));
  for (const t of [
    'Phase state machine (6단계)',
    'GridOverlay SVG (항상 고정)',
    'AlignFrame 타원 가이드',
    'FLabel 점수 라벨 (실시간)',
    'Gauge 원형 그래프 (4종)',
    'TiltBar 기울기 인디케이터',
    '프레임 이탈 UX (1s/2s 타이머)',
    'AsyncStorage 기록 저장',
  ]) blocks.push(bullet(t));

  blocks.push(h3('Phase State Machine'));
  blocks.push(para(txt('idle → aligning (정렬 2초) → scan_start → scanning → finishing → done')));
  blocks.push(divider());

  // ── Session Log ──
  blocks.push(h2('오늘 작업 내역 (Session Log)'));

  const logs = [
    {
      tag: '🎨 Design', title: 'FACEMESH_TESSELATION 기반 와이어프레임 메쉬 UI 전면 교체',
      detail: '기존 랜드마크 점 방식 → 468개 삼각형 연결선 기반 와이어프레임으로 교체. 화이트/사이언 색상, 검은 배경 위에 얇은 선으로 SF 의료 스캐너 느낌 구현. done 단계에서만 완성 메쉬 노출.',
      code: `ctx.strokeStyle = 'rgba(220,235,255,' + (0.18 + fb*0.08) + ')';\nctx.lineWidth = 0.5;`,
    },
    {
      tag: '⚡ Feature', title: 'Surface-following Scan Glow 애니메이션',
      detail: '단순 레이저 라인이 아닌, 얼굴 depth(z좌표)를 반영한 표면 추적 스캔 구현. scanFrac(y,z)로 깊이 보정. GWIN=0.10 슬라이딩 윈도우, 이차함수 alpha falloff.',
      code: `function scanFrac(y, z) { return y + (z||0) * 0.20; }\nvar alpha = norm * norm * 0.32;  // quadratic falloff`,
    },
    {
      tag: '🔧 Fix', title: '좌우 반전 이중 미러 버그 수정',
      detail: 'vx()에서 x 미러 + ctx.scale(-1,1) 이중 반전으로 메쉬가 얼굴 반대 방향으로 움직이던 버그. vx에서 미러 제거, 캔버스 플립만 유지.',
      code: `// BEFORE\nfunction vx(x) { return 1 - (x*sx + ox); }\n// AFTER\nfunction vx(x) { return x*sx + ox; }`,
    },
    {
      tag: '✨ UX', title: 'AlignFrame 타원 가이드 + 2초 카운트다운',
      detail: 'idle + aligning 두 단계 모두에서 타원 가이드 표시. aligning 진입 시 2초 카운트다운. SVG fillRule=evenodd로 타원 외부 마스킹.',
      code: `{(scanPhase === 'idle' || scanPhase === 'aligning') && <AlignFrame/>}\n{scanPhase === 'aligning' && <Text>{alignSeconds}</Text>}`,
    },
    {
      tag: '✨ UX', title: '프레임 이탈 UX — 1s 경고 / 2s 자동 중단',
      detail: '스캔 중 얼굴이 프레임 밖으로 나가면: 1초 미만 무시 → 1초 경과 시 주황 경고 → 2초 경과 시 자동 리셋.',
      code: `faceOutTimerRef → 1000ms → setScanWarning(true)\nfaceOutWarnTimerRef → +1000ms → setPhase('idle')`,
    },
    {
      tag: '🎨 Design', title: 'Full-Screen CAD Grid Overlay',
      detail: '38px 정사각형 셀 기반 화면 전체 격자. 타원 중심(OX=SW/2, OY=SH×0.40) 기준 십자선 별도 강조. 항상 표시.',
      code: `const GRID_CELL = 38;\nconst vxs = Array.from({length: Math.floor((SW-1)/GRID_CELL)}, (_, i) => (i+1)*GRID_CELL);`,
    },
    {
      tag: '⚡ Feature', title: '17개 키 랜드마크 점 + 측정 항목별 색상',
      detail: '전체 468개 → 중심선 7개·눈 6개·입꼬리 2개·광대 2개, 총 17개로 최소화. 각 포인트가 해당 측정 항목 점수 색상으로 개별 렌더링.',
      code: `var KM = [\n  [10,'center'], [9,'center'], [4,'center'], [152,'center'],\n  [468,'eye'], [473,'eye'], [33,'eye'], [133,'eye'],\n  [61,'mouth'], [291,'mouth'], [234,'face'], [454,'face']\n];`,
    },
    {
      tag: '⚡ Feature', title: '점수 ↔ 포인트 색상 실시간 동기화',
      detail: 'done 단계에서 landmarks 수신마다 WebView에 inject. FLabel · Gauge · WebView 점 세 곳이 동일 smoothed 값으로 실시간 연동.',
      code: `if (phaseRef.current === 'done') {\n  webRef.current?.injectJavaScript(\n    \`window.scoreEye=\${s.eye};window.scoreMouth=\${s.mouth};true;\`\n  );\n}`,
    },
  ];

  for (const log of logs) {
    blocks.push(callout(log.tag.split(' ')[0], txt(log.tag.split(' ').slice(1).join(' ') + ' — ' + log.title, { bold: true })));
    blocks.push(para(txt(log.detail)));
    blocks.push(code(log.code));
  }
  blocks.push(divider());

  // ── Color System ──
  blocks.push(h2('점수 색상 시스템'));
  blocks.push(para(txt('FLabel · Gauge · WebView 점 — 세 요소가 동일 임계값과 동일 RGB로 실시간 동기화')));
  blocks.push({
    type: 'table',
    table: {
      table_width: 3,
      has_column_header: true,
      has_row_header: false,
      children: [
        { type: 'table_row', table_row: { cells: [[txt('색상')], [txt('점수 범위')], [txt('HEX')]] } },
        { type: 'table_row', table_row: { cells: [[txt('초록 (Green)')], [txt('≥ 90점')], [txt('#22C55E')]] } },
        { type: 'table_row', table_row: { cells: [[txt('연두 (Lime)')], [txt('80–89점')], [txt('#84CC16')]] } },
        { type: 'table_row', table_row: { cells: [[txt('노랑 (Yellow)')], [txt('70–79점')], [txt('#EAB308')]] } },
        { type: 'table_row', table_row: { cells: [[txt('주황 (Orange)')], [txt('60–69점')], [txt('#F97316')]] } },
        { type: 'table_row', table_row: { cells: [[txt('빨강 (Red)')], [txt('< 60점')], [txt('#EF4444')]] } },
      ]
    }
  });
  blocks.push(divider());

  // ── Features ──
  blocks.push(h2('구현 기능 요약'));
  const features = [
    ['🪞', '미러 모드 기본값', '앱 시작 시 미러 모드로 기본 진입. 라인 모드 전환 시 카메라 피드 없이 검은 배경에 메쉬만 표시.'],
    ['🔬', 'Y축 회전 애니메이션', 'ROT_AMP=0.08 (±4.6°), ROT_SPEED=0.00020. applyRot()으로 정규화 좌표 공간에서 회전 적용 후 vx 변환.'],
    ['⚡', '스캔 완료 플래시', 'finishing → done 전환 시 flashPhase 1→2→0. 사이언 오버레이 max alpha 0.14로 완료 확인 효과.'],
    ['📐', 'AlignFrame 타원 가이드', 'SVG fillRule=evenodd로 타원 외부 마스킹. 모서리 L자 브래킷 4개. idle + aligning 두 단계에서 표시.'],
    ['🎯', '측정 항목 4종', '눈 높이 대칭 · 입꼬리 대칭 · 윤곽 대칭 · 중심선 편차. EMA smoothing (α=0.25)으로 수치 안정화.'],
    ['💾', '기록 저장 & 히스토리', 'AsyncStorage 기반 로컬 저장. analysis.tsx 상세 결과 뷰. history 탭에서 과거 기록 열람.'],
  ];
  for (const [emoji, title, desc] of features) {
    blocks.push(callout(emoji, txt(title, { bold: true }), txt('  ' + desc)));
  }
  blocks.push(divider());

  // ── Bug Fix ──
  blocks.push(h2('문제 발견 & 해결 과정'));
  const bugs = [
    {
      n: 1, title: '이중 미러 — 메쉬가 얼굴 반대 방향으로 움직임',
      detail: 'vx(x)=1-(x*sx+ox)로 x 미러 + ctx.scale(-1,1) 캔버스 플립 = 이중 반전. 얼굴이 오른쪽으로 움직이면 메쉬는 왼쪽으로.',
      fix: 'vx에서 미러 제거, 캔버스 플립만 유지로 해결.',
      before: 'portfolio-assets/bug_double_mirror.png',
      after: 'portfolio-assets/screenshot_done.png',
    },
    {
      n: 2, title: '스캔 전부터 완성 메쉬 노출 — 긴장감 없음',
      detail: 'scan_start 단계부터 전체 테셀레이션 메쉬 + 아이리스 다이아몬드가 표시됨. 스캔의 의미가 없어지는 UX 문제.',
      fix: 'showMesh = isDone 조건으로 done 단계에만 완성 메쉬 표시, 스캔 중에는 subtle glow만.',
      before: 'portfolio-assets/bug_mesh_prescan.png',
      after: 'portfolio-assets/fix_scan_clean.png',
    },
    {
      n: 3, title: '468개 점 전체 출력 — 얼굴이 점으로 덮임',
      detail: 'done 단계에서 468개 랜드마크 전체를 점으로 찍어 얼굴이 점 구름으로 가득 차는 문제.',
      fix: '눈·코·입꼬리·중심선·광대 총 17개 키 포인트로 최소화, 항목별 점수 색상 개별 적용.',
      before: 'portfolio-assets/bug_all_dots.png',
      after: 'portfolio-assets/screenshot_done.png',
    },
  ];
  for (const bug of bugs) {
    blocks.push(h3(`Bug #${bug.n} — ${bug.title}`));
    blocks.push(para(txt(bug.detail)));
    blocks.push(para(txt('해결: ', { bold: true }), txt(bug.fix)));
    blocks.push(para(txt('BEFORE', { bold: true })));
    blocks.push(image(bug.before));
    blocks.push(para(txt('AFTER', { bold: true })));
    blocks.push(image(bug.after));
  }
  blocks.push(divider());

  // ── Result ──
  blocks.push(h2('구현 결과 — 실기기 스크린샷'));
  const results = [
    ['portfolio-assets/screenshot_line_idle.png', 'Line 모드 · idle — 타원 가이드, 검은 배경'],
    ['portfolio-assets/screenshot_aligning.png', 'Mirror 모드 · aligning — 그리드 오버레이 + 카운트다운'],
    ['portfolio-assets/screenshot_done.png', 'Mirror 모드 · done — 17 key points + 점수 라벨'],
  ];
  for (const [path, caption] of results) {
    blocks.push(image(path));
    blocks.push(para(txt(caption, { italic: true })));
  }
  blocks.push(divider());

  // ── Footer ──
  blocks.push(para(txt('Face Balance · Dev Session · 2026.05.30 · app/camera.tsx', { italic: true })));

  return blocks;
}

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'api.notion.com', path, method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function clearPage() {
  let hasMore = true, cursor = null, ids = [];
  while (hasMore) {
    const url = `/v1/blocks/${PAGE_ID}/children?page_size=100` + (cursor ? `&start_cursor=${cursor}` : '');
    const res = await api('GET', url, null);
    for (const b of res.results) ids.push(b.id);
    hasMore = res.has_more;
    cursor = res.next_cursor;
  }
  for (const id of ids) await api('DELETE', `/v1/blocks/${id}`, null);
  console.log(`🗑  ${ids.length}개 블록 삭제`);
}

async function main() {
  await clearPage();
  const blocks = buildBlocks();
  console.log(`📄 총 ${blocks.length}개 블록`);
  const BATCH = 100;
  for (let i = 0; i < blocks.length; i += BATCH) {
    const batch = blocks.slice(i, i + BATCH);
    const res = await api('PATCH', `/v1/blocks/${PAGE_ID}/children`, { children: batch });
    if (res.object === 'error') { console.error('❌', res.message); return; }
    console.log(`✅ ${i + 1}~${Math.min(i + BATCH, blocks.length)}`);
  }
  console.log('🎉 완료!');
}

main().catch(console.error);
