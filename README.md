# Pit-Wall

F1 팬용 일정·순위 앱 — 웹과 iOS/Android 앱(Capacitor)을 같은 코드베이스로 제공

- 시즌 전체 일정을 한국시간(KST)으로 변환해 표시 (진행중/예정/완료 그룹)
- 다음 세션까지 실시간 카운트다운
- 드라이버 / 컨스트럭터 포인트 순위
- 구글/카카오 소셜 로그인 (Supabase Auth, 앱 필수 로그인)

데이터 출처: [Jolpica-F1 API](https://github.com/jolpica/jolpica-f1) (Ergast 호환, 무료·무인증)

## 개발

```bash
npm install
cp .env.local.example .env.local   # Supabase URL/anon key 입력 필요
npm run dev                        # http://localhost:8765
```

앱 빌드는 `npm run build && npx cap sync` 후 Xcode/Android Studio에서 실행.
자세한 아키텍처와 명령어는 [CLAUDE.md](CLAUDE.md), 현재 진행 상황은 [docs/STATUS.md](docs/STATUS.md) 참고.

## 배포

- 웹: main 브랜치 push 시 GitHub Actions가 Vite 빌드 후 GitHub Pages로 자동 배포
- 배포 URL: https://shan0873.github.io/Pit-Wall/
- 앱: 스토어 출시 준비 중 (진행 상황은 docs/STATUS.md)

## 로드맵

굿즈 구매대행, 커뮤니티 게시판/실시간 채팅 등은 다음 버전(P2)에서 다룰 예정입니다.
