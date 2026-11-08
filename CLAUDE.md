# gallery.zanviq.dev

배포는 TwoMES Hosting(https://github.com/Zanviq/HOSTING) 의 docs/app-contract.md 규칙을 따른다.

- 빌드 단계 없는 정적 사이트. 홈은 `data/works.json`(단일 소스)을 읽어 카드를 그린다.
- 작품은 `works/<slug>/` 독립 폴더. 서로 간섭하지 않게, 빌드가 필요한 작품은 결과물만 넣는다.
- 작품 주소는 `/<slug>/` (deploy/nginx.conf 의 `@work`). 작품 안 경로는 상대 경로만, 예외는 `/shared/back.js`. 로컬은 `python tools/serve.py` 가 같은 규칙으로 연다.
- `main` 에 push 하면 자동 배포된다. push 는 사용자에게 묻고 한다.
- 배포 대상은 Dockerfile 의 `COPY` 목록이 정한다. 새 최상위 폴더를 서빙하려면 Dockerfile 에도 추가한다.
- `design/` 은 시안 전용. 배포 이미지에 넣지 않는다.
