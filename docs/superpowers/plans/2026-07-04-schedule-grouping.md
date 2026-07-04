# 시즌 일정 그룹화 (진행중/예정/완료) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html`의 시즌 일정 테이블을 진행중/예정/완료 세 그룹으로 나누고, 완료 그룹은 기본적으로 접어둔다.

**Architecture:** 순수 vanilla JS, 빌드 없는 단일 HTML 파일. `renderSchedule(now)` 함수를 그룹 분류 헬퍼(`computeRaceGroups`)와 행/테이블 렌더 헬퍼(`raceRowHTML`, `raceTableHTML`)로 분리해 재사용한다. 자동화 테스트 프레임워크가 없는 프로젝트이므로, 검증은 브라우저에서 직접 실행하며 콘솔로 `now`를 조작해 세 그룹 케이스를 확인하는 방식으로 대체한다.

**Tech Stack:** HTML/CSS/vanilla JS (빌드 도구 없음), Python `http.server`로 로컬 서빙

---

## 참고: 관련 스펙

`docs/superpowers/specs/2026-07-04-schedule-grouping-design.md`

## 현재 코드 (수정 대상)

`index.html:270-298`:

```js
function renderSchedule(now){
  const el = document.getElementById("schedule-body");
  const nextRound = nextSession ? nextSession.round : null;
  let rows = races.map(r => {
    const raceDt = toKST(r.date, r.time);
    const isNext = r.round === nextRound;
    const isPast = raceDt < now;
    const sessRows = allSessions.filter(s => s.round === r.round)
      .map(s => `<tr><td>${s.name}</td><td>${fmtKST(s.dt)}</td></tr>`).join("");
    return `
      <tr class="${isNext ? 'next-race' : ''}">
        <td class="pos">${r.round}</td>
        <td>
          ${r.raceName}${isNext ? ' <span class="badge">NEXT</span>' : ''}
          <div class="muted">${r.Circuit.circuitName}, ${r.Circuit.Location.country}</div>
          <details><summary>세션별 KST 시간 보기</summary>
            <table class="sess-table"><tbody>${sessRows}</tbody></table>
          </details>
        </td>
        <td class="muted" style="white-space:nowrap;">${fmtKSTShort(raceDt)}</td>
        <td class="muted">${isPast ? '완료' : '예정'}</td>
      </tr>`;
  }).join("");
  el.innerHTML = `
    <table>
      <thead><tr><th>R</th><th>그랑프리</th><th>레이스(KST)</th><th>상태</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
```

`상태` 컬럼은 그룹 헤더가 상태를 대신 표현하므로 제거한다 (그룹 안에서 굳이 반복 표시할 필요 없음).

---

### Task 1: 그룹 분류 + 렌더 헬퍼 함수 작성, `renderSchedule` 교체

**Files:**
- Modify: `index.html:270-298` (기존 `renderSchedule` 함수를 아래 내용으로 전체 교체)

- [ ] **Step 1: 기존 `renderSchedule` 함수를 아래 코드로 교체**

`index.html`의 270번째 줄부터 298번째 줄(`function renderSchedule(now){` ~ 마지막 `}`)까지를 다음으로 교체한다:

```js
function computeRaceGroups(raceList, now){
  const groups = { live: [], upcoming: [], completed: [] };
  raceList.forEach(r => {
    const sessions = allSessions.filter(s => s.round === r.round);
    const weekendStart = sessions.reduce((min, s) => s.dt < min ? s.dt : min, sessions[0].dt);
    const raceDt = toKST(r.date, r.time);
    if(now < weekendStart) groups.upcoming.push(r);
    else if(now <= raceDt) groups.live.push(r);
    else groups.completed.push(r);
  });
  return groups;
}

function raceRowHTML(r, nextRound){
  const raceDt = toKST(r.date, r.time);
  const isNext = r.round === nextRound;
  const sessRows = allSessions.filter(s => s.round === r.round)
    .map(s => `<tr><td>${s.name}</td><td>${fmtKST(s.dt)}</td></tr>`).join("");
  return `
    <tr class="${isNext ? 'next-race' : ''}">
      <td class="pos">${r.round}</td>
      <td>
        ${r.raceName}${isNext ? ' <span class="badge">NEXT</span>' : ''}
        <div class="muted">${r.Circuit.circuitName}, ${r.Circuit.Location.country}</div>
        <details><summary>세션별 KST 시간 보기</summary>
          <table class="sess-table"><tbody>${sessRows}</tbody></table>
        </details>
      </td>
      <td class="muted" style="white-space:nowrap;">${fmtKSTShort(raceDt)}</td>
    </tr>`;
}

function raceTableHTML(list, nextRound){
  return `
    <table>
      <thead><tr><th>R</th><th>그랑프리</th><th>레이스(KST)</th></tr></thead>
      <tbody>${list.map(r => raceRowHTML(r, nextRound)).join("")}</tbody>
    </table>`;
}

function renderSchedule(now){
  const el = document.getElementById("schedule-body");
  const nextRound = nextSession ? nextSession.round : null;
  const { live, upcoming, completed } = computeRaceGroups(races, now);

  let html = "";

  if(live.length){
    html += `<h3 class="group-title">진행중</h3>${raceTableHTML(live, nextRound)}`;
  }

  html += `<h3 class="group-title">예정</h3>`;
  html += upcoming.length
    ? raceTableHTML(upcoming, nextRound)
    : `<div class="muted">예정된 그랑프리가 없습니다 (시즌 종료).</div>`;

  if(completed.length){
    html += `
      <details class="completed-group">
        <summary>완료된 그랑프리 (${completed.length})</summary>
        ${raceTableHTML(completed, nextRound)}
      </details>`;
  }

  el.innerHTML = html;
}
```

- [ ] **Step 2: 변경 사항 저장 확인**

`index.html`을 저장한 뒤, 아래 명령으로 문법 오류가 없는지(즉 `function`/`{`/`}` 짝이 맞는지) 빠르게 확인한다:

Run: `node --check index.html 2>&1 || node -e "new Function(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1])" `

Expected: 두 번째 명령이 에러 없이 종료됨 (스크립트 블록만 추출해 문법 파싱)

- [ ] **Step 3: Commit**

```bash
cd "/Users/sehunan/Documents/Mark/Pit-Wall"
git add index.html
git commit -m "feat: group season schedule into live/upcoming/completed"
```

---

### Task 2: 그룹 헤더 및 접힘 영역 스타일 추가

**Files:**
- Modify: `index.html:59-61` (기존 `.muted`, `details summary`, `.sess-table` 규칙 근처에 추가)

- [ ] **Step 1: CSS 규칙 추가**

`index.html`의 `.sess-table{margin-top:8px;}` 줄(61번째 줄) 바로 다음에 아래 CSS를 추가한다:

```css
  .group-title{margin:16px 0 8px; font-size:12px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.5px;}
  .group-title:first-child{margin-top:0;}
  details.completed-group{margin-top:16px;}
  details.completed-group > summary{font-size:13px; font-weight:600;}
  details.completed-group table{margin-top:10px;}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/sehunan/Documents/Mark/Pit-Wall"
git add index.html
git commit -m "style: add group header and collapsed section styles"
```

---

### Task 3: 브라우저에서 세 그룹 케이스 수동 검증

자동화된 테스트 러너가 없는 프로젝트이므로, 로컬 서버로 띄운 뒤 브라우저 콘솔에서 데이터를 직접 조작해 세 가지 케이스를 확인한다.

**Files:** 없음 (검증 전용, 코드 변경 없음)

- [ ] **Step 1: 로컬 서버 실행**

Run: `cd "/Users/sehunan/Documents/Mark/Pit-Wall" && python3 -m http.server 8765`

Expected: `Serving HTTP on :: port 8765` 로그 출력

- [ ] **Step 2: 기본 상태 확인 (현재 시각 기준)**

`http://localhost:8765/index.html`을 브라우저로 열고, "시즌 일정" 카드에서 아래를 확인한다:
- 지난 라운드들이 "완료된 그랑프리 (N)"으로 접혀 있는지
- 접힌 항목을 클릭하면 펼쳐지는지
- 남은 라운드가 "예정" 아래 정상적으로 나열되는지

- [ ] **Step 3: "진행중" 케이스 확인 (콘솔에서 강제 렌더)**

브라우저 개발자 도구 콘솔에서 아래를 실행해, 첫 번째 라운드가 진행중인 것처럼 강제로 렌더링해본다:

```js
const fakeNow = allSessions.find(s => s.round === races[0].round && s.key === "Race").dt;
renderSchedule(new Date(fakeNow.getTime() - 60 * 60 * 1000)); // 레이스 1시간 전 = 그 주말 "진행중"
```

Expected: "진행중" 섹션에 `races[0]`이 표시됨

- [ ] **Step 4: "예정만 있고 완료가 없는" 케이스 확인**

```js
renderSchedule(new Date(allSessions[0].dt.getTime() - 60 * 60 * 1000)); // 시즌 첫 세션 이전
```

Expected: "완료된 그랑프리" `<details>`가 아예 나타나지 않고, 모든 라운드가 "예정"에 표시됨

- [ ] **Step 5: 원래 상태로 복구**

Run (콘솔에서): `location.reload()`

Expected: 새로고침 후 현재 실제 시각 기준으로 정상 렌더링됨

- [ ] **Step 6: 로컬 서버 종료**

`http.server` 프로세스를 Ctrl+C로 종료한다.

---

### Task 4: 배포 push 및 라이브 사이트 확인

**Files:** 없음 (배포 전용)

- [ ] **Step 1: 원격 push**

```bash
cd "/Users/sehunan/Documents/Mark/Pit-Wall"
TOKEN=$(grep '^TOKEN=' github_token.txt | cut -d= -f2-)
git remote set-url origin "https://${TOKEN}@github.com/shan0873/Pit-Wall.git"
git push origin main
git remote set-url origin https://github.com/shan0873/Pit-Wall.git
```

Expected: `main -> main` 업데이트 로그, 에러 없음 (마지막 줄에서 origin URL이 토큰 없는 형태로 복구됨)

- [ ] **Step 2: GitHub Actions 배포 완료 확인**

Run:
```bash
sleep 20
curl -s -o /dev/null -w "%{http_code}\n" https://shan0873.github.io/Pit-Wall/
```

Expected: `200`

- [ ] **Step 3: 실제 페이지에서 그룹 표시 확인**

Run:
```bash
curl -s https://shan0873.github.io/Pit-Wall/ | grep -o 'group-title\|completed-group'
```

Expected: `group-title`, `completed-group` 문자열이 출력됨 (새 마크업이 배포된 index.html에 반영됐는지 확인)
