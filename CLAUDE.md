# gallery.zanviq.dev

배포는 TwoMES Hosting(https://github.com/Zanviq/HOSTING) 의 docs/app-contract.md 규칙을 따른다.

- 빌드 단계 없는 정적 사이트. 홈은 `data/works.json`(단일 소스)을 읽어 카드를 그린다.
- 작품은 `works/<slug>/` 독립 폴더. 서로 간섭하지 않게, 빌드가 필요한 작품은 결과물만 넣는다.
- 배포 대상은 Dockerfile 의 `COPY` 목록이 정한다. 새 최상위 폴더를 서빙하려면 Dockerfile 에도 추가한다.
- `design/` 은 시안 전용. 배포 이미지에 넣지 않는다.
