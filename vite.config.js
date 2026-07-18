import { defineConfig } from 'vite';

export default defineConfig({
  // 상대 경로 base: GitHub Pages 프로젝트 사이트(/Pit-Wall/ 하위 경로)와
  // Capacitor(capacitor://localhost 루트) 양쪽에서 자산 경로가 깨지지 않게 한다.
  // '/'(절대 경로)로 되돌리면 GitHub Pages 배포가 빈 화면이 된다.
  base: './',
  server: {
    port: 8765,
  },
});
