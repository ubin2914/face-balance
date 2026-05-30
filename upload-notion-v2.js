const https = require('https');

const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = '370291a09b41807da356f7ff20c77a42';
const RAW = 'https://raw.githubusercontent.com/ubin2914/face-balance/master';

// ── 블록 헬퍼 ──────────────────────────────────────────────
function t(content, ann = {}) {
  const o = { type: 'text', text: { content: String(content) } };
  if (Object.keys(ann).length) o.annotations = ann;
  return o;
}
const h1 = s => ({ type: 'heading_1', heading_1: { rich_text: [t(s)] } });
const h2 = s => ({ type: 'heading_2', heading_2: { rich_text: [t(s)] } });
const h3 = s => ({ type: 'heading_3', heading_3: { rich_text: [t(s)] } });
const p  = (...r) => ({ type: 'paragraph', paragraph: { rich_text: r.flat() } });
const div = () => ({ type: 'divider', divider: {} });
const bul = s => ({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: [t(s)] } });
const cd  = (s, lang = 'javascript') => ({ type: 'code', code: { rich_text: [t(s)], language: lang } });
const qt  = s => ({ type: 'quote', quote: { rich_text: [t(s)] } });
const img = path => ({ type: 'image', image: { type: 'external', external: { url: `${RAW}/${path}` } } });
const callout = (emoji, ...r) => ({ type: 'callout', callout: { icon: { type: 'emoji', emoji }, rich_text: r.flat() } });
const date_tag = s => callout('📅', t(s, { bold: true }));

// 2컬럼: 이미지 + 캡션 (이미지 크기 절반 효과)
const imgCol = (path, caption) => ({
  type: 'column_list',
  column_list: {
    children: [
      { type: 'column', column: { children: [img(path)] } },
      { type: 'column', column: { children: [p(t(caption, { italic: true }))] } },
    ]
  }
});

// 2컬럼: 이미지 두 개 나란히
const img2Col = (p1, p2) => ({
  type: 'column_list',
  column_list: {
    children: [
      { type: 'column', column: { children: [img(p1)] } },
      { type: 'column', column: { children: [img(p2)] } },
    ]
  }
});

// 프롬프트 callout
const prompt = s => callout('💬', t('프롬프트:  ', { bold: true }), t(`"${s}"`));

// ── 포트폴리오 블록 구성 ────────────────────────────────────
function buildBlocks() {
  return [

    // ── 표지 ──────────────────────────────────────────────
    h1('Face Balance — AI 협업 개발 포트폴리오'),
    p(t('얼굴 좌우 균형을 실시간으로 측정하고 셀프 트레이닝하는 iOS 앱', { italic: true })),
    p(
      t('기획부터 실기기 빌드까지 ', { bold: true }),
      t('Claude와 단일 세션'), t(' — '), t('1인 AI 협업 프로젝트', { bold: true })
    ),
    {
      type: 'table',
      table: {
        table_width: 2, has_column_header: false, has_row_header: true,
        children: [
          { type: 'table_row', table_row: { cells: [[t('플랫폼')], [t('iOS · React Native / Expo SDK 54')]] } },
          { type: 'table_row', table_row: { cells: [[t('핵심 기술')], [t('MediaPipe Face Mesh 478점 실시간 얼굴 대칭 측정')]] } },
          { type: 'table_row', table_row: { cells: [[t('개발 기간')], [t('첫 세션 1일 (2026-05-29) · 이후 지속 업데이트')]] } },
          { type: 'table_row', table_row: { cells: [[t('결과')], [t('실기기 빌드 성공 · Notion 포트폴리오 자동화')]] } },
        ]
      }
    },
    div(),

    // ── STEP 1 ─────────────────────────────────────────────
    date_tag('2026-05-29 · STEP 1 — 기획 & MVP 첫 화면'),
    h2('아이디어 & 목표'),
    qt('"얼굴 좌우 균형을 실시간으로 분석해주는 앱이 없을까? 셀프 트레이닝용으로 만들어보자"'),
    p(t('기술 선택: '), t('MediaPipe Face Mesh', { bold: true }), t(' (478 랜드마크, 브라우저 WASM 지원) → WebView 안에서 실행해 React Native와 연결')),
    h2('첫 화면 구현'),
    imgCol('screenshots/01_mvp_camera.PNG', 'MVP 첫 화면 — 전면 카메라 + 보라색 타원 가이드'),
    prompt('전면 카메라로 얼굴 찍고 분석 결과 보여주는 앱 만들어줘'),
    p(t('→ Expo + React Native WebView + MediaPipe 조합으로 즉시 구조 설계. 타원 가이드 프레임까지 1회 통과.')),
    div(),

    // ── STEP 2 ─────────────────────────────────────────────
    date_tag('2026-05-29 · STEP 2 — MediaPipe 연결 + 오류 3종 격파'),
    h2('오류 1 — getUserMedia 미정의'),
    imgCol('screenshots/02_error_getusermedia.PNG', 'WebView about:blank → insecure context 차단'),
    callout('🔴', t('원인: ', { bold: true }), t('about:blank는 insecure context라 카메라 접근 차단')),
    prompt('에러 스크린샷 첨부 → 당장 해결해'),
    callout('✅', t('해결: ', { bold: true }), t('baseUrl: "http://localhost/" 추가 → secure context 인식')),

    h2('오류 2 — FileSystem 모듈 없음'),
    imgCol('screenshots/03_error_filesystem.PNG', 'expo-file-system 버전 충돌 (SDK 54에 v56 설치됨)'),
    prompt('이것도 해결해'),
    callout('✅', t('해결: ', { bold: true }), t('npx expo install expo-file-system → ~19.0.23 버전 고정')),

    h2('오류 3 — UTF8 undefined'),
    imgCol('screenshots/04_error_utf8.PNG', 'FileSystem.EncodingType.UTF8 → undefined'),
    prompt('작동이 안돼 문제 당장 해결해. 말 짧게하고.'),
    callout('✅', t('해결: ', { bold: true }), t('encoding 옵션 제거 — 기본값이 이미 UTF8')),
    callout('💡', t('AI 사용 전략: ', { bold: true }), t('에러 스크린샷 첨부만으로 Claude가 원인 분석 + 해결까지 자동 수행. 설명 불필요.')),
    div(),

    // ── STEP 3 ─────────────────────────────────────────────
    date_tag('2026-05-29 · STEP 3 — 얼굴 왜곡 발견 & Cover 모드 해결'),
    h2('문제 — 478점 매핑 성공했지만 얼굴이 길쭉하게 왜곡'),
    img2Col('screenshots/05_face_stretched.PNG', 'screenshots/06_mediapipe_working.PNG'),
    p(t('BEFORE', { bold: true }), t(' 640×480 가로 영상을 세로 화면에 비율 무시 강제 확대  →  '), t('AFTER', { bold: true }), t(' Cover 모드 수식 + 랜드마크 좌표 동일 변환')),
    prompt('매핑은 완벽해. 근데 얼굴이 왜 길쭉해졌니'),
    callout('💡', t('AI 사용 전략: ', { bold: true }), t('기능은 칭찬 → 문제만 정확히 지목 → Claude가 해당 영역만 수정. 불필요한 재작업 방지.')),
    cd('var scale = Math.max(W/vw, H/vh);\nvar dw=vw*scale, dh=vh*scale, dx=(W-dw)/2, dy=(H-dh)/2;'),
    div(),

    // ── STEP 4 ─────────────────────────────────────────────
    date_tag('2026-05-29 · STEP 4 — UI 고도화: 미러 모드 + 원형 게이지'),
    h2('레퍼런스 이미지로 방향 설정'),
    img2Col('screenshots/ref_3d_wireframe.PNG', 'screenshots/ref_landmarks.PNG'),
    p(t('3D 렌더 느낌 스캔 애니메이션 + 얼굴 랜드마크 배치를 시각적으로 참고')),
    prompt('참고 이미지 첨부 + 항목별 상세 명세 전달'),
    callout('💡', t('AI 사용 전략: ', { bold: true }), t('텍스트 설명 대신 이미지 첨부 → 구현 방향 오해 없이 1회 통과. 참고 이미지가 1000 토큰 절약.')),
    h2('구현 결과'),
    img2Col('screenshots/07_mirror_mode.PNG', 'screenshots/08_line_mode.PNG'),
    p(t('미러 모드', { bold: true }), t('  ·  '), t('라인 모드', { bold: true }), t(' — 실시간 점수 게이지 4개, 배경 그리드 토글, 3D 스캔 빔 애니메이션')),
    div(),

    // ── STEP 5 ─────────────────────────────────────────────
    date_tag('2026-05-29 · STEP 5 — 최종 완성 v1: Vignette + 입꼬리 대칭선'),
    h2('주요 추가 기능'),
    bul('Vignette: 얼굴 타원 바깥 54% 어둡게 (ctx.ellipse hole 방식)'),
    bul('입꼬리 대칭선: 좌/우 반쪽 독립 색상 (대칭=초록, 비대칭=주황)'),
    bul('10개 측정 포인트: 점수 기반 파랑/초록/노랑/주황'),
    bul('플로팅 레이블: 얼굴 랜드마크 위치에 실시간 점수 표시'),
    bul('저장 팝업: "기록되었습니다" 토스트 (화면 이동 없음)'),
    img2Col('screenshots/09_final_mirror.PNG', 'screenshots/10_final_line.PNG'),
    p(t('최종 미러 모드', { bold: true }), t('  ·  '), t('최종 라인 모드', { bold: true })),
    prompt('매핑은 그대로 유지해. 대신 Vignette 바깥 54%만 어둡게 해줘'),
    callout('💡', t('AI 사용 전략: ', { bold: true }), t('변경 범위를 명확히 경계 → 기존 기능 건드리지 않고 신규 기능만 추가. "그대로 유지해. 대신 ~" 패턴.')),
    div(),

    // ── STEP 6 ─────────────────────────────────────────────
    date_tag('2026-05-30 18:00 · STEP 6 — 스캔 UI 전면 개편 v2'),
    h2('목표: 3D 스캐너 느낌의 몰입감 있는 스캔 UI'),
    callout('🎨', t('FACEMESH_TESSELATION 와이어프레임: ', { bold: true }), t('468개 삼각형 연결선 기반. done 단계에서만 완성 메쉬 노출. SF 의료 스캐너 느낌')),
    cd(`ctx.strokeStyle = 'rgba(220,235,255,' + (0.18 + fb*0.08) + ')';\nctx.lineWidth = 0.5;`),
    callout('⚡', t('Surface Following Scan Glow: ', { bold: true }), t('얼굴 depth(z좌표) 반영한 표면 추적 스캔. scanFrac(y,z)로 깊이 보정')),
    cd(`function scanFrac(y, z) { return y + (z||0) * 0.20; }\nvar alpha = norm * norm * 0.32;  // quadratic falloff`),
    callout('🔧', t('이중 미러 버그 수정: ', { bold: true }), t('vx()에서 x 미러 + ctx.scale(-1,1) 이중 반전 → vx 미러 제거, 캔버스 플립만 유지')),
    callout('✨', t('AlignFrame + 2초 카운트다운: ', { bold: true }), t('idle + aligning 두 단계 모두 표시. 프레임 이탈 시 1s 경고 → 2s 자동 리셋')),
    callout('🎨', t('Full-Screen CAD Grid: ', { bold: true }), t('38px 정사각형 셀. OX/OY 십자선 강조. 항상 표시')),
    callout('⚡', t('17개 키 랜드마크 + 실시간 점수 동기화: ', { bold: true }), t('468개 → 17개로 최소화. FLabel · Gauge · WebView 점 3곳 실시간 연동')),
    h2('실기기 결과'),
    {
      type: 'column_list',
      column_list: {
        children: [
          { type: 'column', column: { children: [img('portfolio-assets/screenshot_line_idle.png'), p(t('Line 모드 · idle', { italic: true }))] } },
          { type: 'column', column: { children: [img('portfolio-assets/screenshot_aligning.png'), p(t('Mirror 모드 · aligning', { italic: true }))] } },
          { type: 'column', column: { children: [img('portfolio-assets/screenshot_done.png'), p(t('Mirror 모드 · done', { italic: true }))] } },
        ]
      }
    },
    div(),

    // ── STEP 7 ─────────────────────────────────────────────
    date_tag('2026-05-31 00:30 · STEP 7 — 포트폴리오 자동화: GitHub + Notion 연동'),
    bul('GitHub 레포 생성 (ubin2914/face-balance) — 소스코드 + 스크린샷 전체 push'),
    bul('Notion MCP 연결 — Claude Code와 Notion API 직접 연동 (~/.claude/mcp.json)'),
    bul('PORTFOLIO.md → Notion 자동 변환 스크립트 — H1/H2/H3, 표, 이미지 블록, 구분선 완전 지원'),
    bul('매 작업 세션 후 포폴 자동 갱신 워크플로 구축'),
    div(),

    // ── STEP 8 ─────────────────────────────────────────────
    date_tag('2026-05-31 02:00 · STEP 8 — 앱 아이콘 교체 + 기기 호환성 수정'),
    h2('앱 아이콘'),
    imgCol('assets/images/icon.png', '3D 와이어프레임 얼굴 + 스캔 브래킷 디자인 (AI 생성)'),
    bul('assets/images/icon.png 및 ios AppIcon.appiconset 동시 교체'),
    bul('iOS 알파 채널 제거 (JPEG 경유 변환) + 1024×1024 리사이즈'),
    bul('iOS 아이콘 캐시 해결: 앱 삭제 → Clean Build → 재설치'),
    h2('기기별 카메라 줌 통일'),
    callout('🐛', t('문제: ', { bold: true }), t('XR(H=896) vs 13 Pro(H=844) — 화면 높이 차이로 cover 스케일이 달라 얼굴 크기가 기기마다 다름')),
    cd(`// BEFORE: 화면 높이에 따라 줌 달라짐\nvar scale = Math.max(W/vw, H/vh);\n\n// AFTER: 너비 기준 고정 → 기기 무관 동일 비율\nvar scale = W/vw;`),
    div(),

    // ── AI 협업 전략 총정리 ────────────────────────────────
    h1('AI 협업 프롬프트 전략 총정리'),
    {
      type: 'table',
      table: {
        table_width: 3, has_column_header: true, has_row_header: false,
        children: [
          { type: 'table_row', table_row: { cells: [[t('상황')], [t('전략')], [t('효과')]] } },
          { type: 'table_row', table_row: { cells: [[t('에러 발생')], [t('스크린샷 + "당장 해결해"')], [t('원인 분석까지 자동 수행')]] } },
          { type: 'table_row', table_row: { cells: [[t('UI 수정 요청')], [t('참고 이미지 첨부 + 항목 명세')], [t('재수정 없이 1회 통과')]] } },
          { type: 'table_row', table_row: { cells: [[t('기능 유지 요청')], [t('"매핑은 그대로 유지해. 대신 ~"')], [t('변경 범위 명확히 경계')]] } },
          { type: 'table_row', table_row: { cells: [[t('작업 속도 조절')], [t('"말 짧게, 토큰 아끼게"')], [t('설명 최소화, 코드 바로 작성')]] } },
          { type: 'table_row', table_row: { cells: [[t('기능 문의')], [t('"MediaPipe에 직접 연결하는 방법은?"')], [t('구체적 구현 방법 바로 제시')]] } },
        ]
      }
    },
    div(),
    p(t('개발: 콩유빈  ·  AI 협업: Claude Sonnet 4.6 (Anthropic)  ·  ', { italic: true }), t('github.com/ubin2914/face-balance', { italic: true })),
  ];
}

// ── API & 업로드 ────────────────────────────────────────────
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
    hasMore = res.has_more; cursor = res.next_cursor;
  }
  for (const id of ids) await api('DELETE', `/v1/blocks/${id}`, null);
  console.log(`🗑  ${ids.length}개 블록 삭제`);
}

async function main() {
  await clearPage();
  const blocks = buildBlocks();
  console.log(`📄 총 ${blocks.length}개 블록`);
  const BATCH = 20; // column_list는 중첩 블록이라 작게 배치
  for (let i = 0; i < blocks.length; i += BATCH) {
    const batch = blocks.slice(i, i + BATCH);
    const res = await api('PATCH', `/v1/blocks/${PAGE_ID}/children`, { children: batch });
    if (res.object === 'error') {
      console.error('❌', res.message);
      console.error(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`✅ ${i + 1}~${Math.min(i + BATCH, blocks.length)}`);
  }
  console.log('🎉 완료!');
}

main().catch(console.error);
