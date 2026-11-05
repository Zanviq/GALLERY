# gallery.zanviq.dev

만든 웹페이지, 미니 게임, 배포한 완성작을 모아 두는 전시용 사이트. 빌드 단계 없는 정적 사이트(바닐라 HTML/CSS/JS)이고, 홈은 `data/works.json`을 읽어 카드를 그린다.

```
index.html          홈(대시보드)
assets/             홈 전용 css, js, font, 이미지
data/works.json     작품 목록 (단일 소스)
works/<slug>/       작품 하나 = 독립 폴더 (자체 index.html)
thumbnails/         홈 카드용 썸네일 (webp)
og/                 공유용 OG 이미지
shared/             작품 페이지 공통 스니펫
design/proposals/   홈 시안 (배포 제외)
deploy/nginx.conf   컨테이너 nginx 설정
Dockerfile          배포 이미지
```

## 작품 추가

1. **폴더 만들기** — `works/<slug>/index.html`. 빌드가 필요한 작품(React/Vite 등)은 빌드 결과물만 넣는다. 경로는 상대 경로로 (`vite build --base=./`). 외부에 배포한 작품(external)은 폴더가 필요 없다.
2. **works.json에 항목 추가**

   ```json
   {
     "slug": "neon-landing",
     "title": "Neon Landing",
     "type": "internal",
     "url": "works/neon-landing/",
     "tags": ["landing", "animation"],
     "thumbnail": "thumbnails/neon-landing.webp",
     "year": 2026
   }
   ```

   - `internal`: 레포 안 `works/<slug>/`. `url`은 `works/<slug>/`
   - `external`: 배포된 외부 주소를 `url`에 적는다. 홈에서 새 탭으로 열리고 외부 링크 표시가 붙는다
3. **썸네일 추가** — `thumbnails/<slug>.webp` (4:3, 가로 1200px 이하 권장). 공유 이미지가 따로 필요하면 `og/<slug>.png` (1200×630).

로컬 확인: 레포 루트에서 `python -m http.server 8000` → http://localhost:8000

## 배포

[TwoMES Hosting](https://github.com/Zanviq/HOSTING)의 [app-contract.md](https://github.com/Zanviq/HOSTING/blob/main/docs/app-contract.md) 규칙을 따른다. **Dockerfile 방식** (서비스 하나).

- 대시보드에서 저장소 `Zanviq/GALLERY`, 브랜치 `main`, 루트 `.` 선택
- 포트 `8080`, 도메인 `gallery.zanviq.dev`
- 저장공간·환경변수는 필요 없다
- 헬스체크: 이미지에 `HEALTHCHECK`(`GET /healthz`)가 들어 있어 배포 성공 판정에 그대로 쓰인다
- `design/`은 `.dockerignore`와 Dockerfile의 명시적 `COPY`로 이미지에서 빠지고, nginx도 `/design/`을 404로 막는다

로컬에서 이미지 확인:

```bash
docker build -t gallery . && docker run --rm -p 8080:8080 gallery
```
