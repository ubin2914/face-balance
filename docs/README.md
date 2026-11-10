# Face Balance — 웹 버전

링크로 바로 열리는 Face Balance 웹 앱 (온보딩 → 홈 → 실시간 카메라 스캔 → 리포트).
스캔 화면은 MediaPipe Face Mesh(478 포인트)로 브라우저에서 실시간 얼굴 대칭을 측정합니다. 영상은 기기 안에서만 처리되고 저장되지 않습니다.

## 배포 (GitHub Pages)
Settings → Pages → Branch: `master` / `/docs` → Save

## 폰에 설치
- iPhone: Safari → 공유 → 홈 화면에 추가
- Android: Chrome → ⋮ → 홈 화면에 추가 / 앱 설치

※ 리포트 화면의 총점은 스캔 결과로 바뀌고, 세부 항목은 예시 데이터입니다. 의료 진단용이 아닙니다.

## 3D 얼굴 모델 출처
홈 화면의 3D 얼굴 메쉬는 "Infinite, 3D Head Scan" by Lee Perry-Smith (www.triplegangers.com / ir-ltd.net)를 바탕으로 리메쉬·변형했습니다. 라이선스: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). 원본 파일은 three.js 예제(examples/models/gltf/LeePerrySmith)에서 받았습니다.
