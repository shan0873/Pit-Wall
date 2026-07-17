export function initApp(onLogout) {
  const headerEl = document.querySelector('header');
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = '로그아웃';
  logoutBtn.className = 'secondary';
  logoutBtn.style.cssText = 'position:absolute; top:20px; right:16px; padding:6px 12px; font-size:12px;';
  logoutBtn.onclick = onLogout;
  headerEl.style.position = 'relative';
  headerEl.appendChild(logoutBtn);

const API = "https://api.jolpi.ca/ergast/f1";

const TEAM_COLORS = {
  mercedes:"#27F4D2", ferrari:"#E8002D", mclaren:"#FF8000", red_bull:"#3671C6",
  alpine:"#00A1E8", rb:"#6C98FF", haas:"#B6BABD", williams:"#64C4FF",
  audi:"#0033A0", aston_martin:"#229971", cadillac:"#8A8D8F", sauber:"#52C832"
};

const SESSION_LABELS = {
  FirstPractice:"FP1", SecondPractice:"FP2", ThirdPractice:"FP3",
  SprintQualifying:"스프린트 예선", Sprint:"스프린트", Qualifying:"예선", Race:"레이스"
};

function toKST(dateStr, timeStr){
  // dateStr: 2026-03-08, timeStr: 04:00:00Z
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt;
}
function fmtKST(dt){
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone:"Asia/Seoul", month:"long", day:"numeric", weekday:"short",
    hour:"2-digit", minute:"2-digit", hour12:false
  }).format(dt) + " (KST)";
}
function fmtKSTShort(dt){
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone:"Asia/Seoul", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", hour12:false
  }).format(dt);
}

async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

let allSessions = []; // flattened {raceName, name, dt}
let nextSession = null;
let races = [];
let notifyStatusMsg = "";

async function loadSchedule(){
  const data = await fetchJSON(`${API}/current.json`);
  races = data.MRData.RaceTable.Races;
  const now = new Date();

  races.forEach(r => {
    const sessDefs = [
      ["FirstPractice", r.FirstPractice],
      ["SecondPractice", r.SecondPractice],
      ["ThirdPractice", r.ThirdPractice],
      ["SprintQualifying", r.SprintQualifying],
      ["Sprint", r.Sprint],
      ["Qualifying", r.Qualifying],
      ["Race", { date: r.date, time: r.time }],
    ];
    sessDefs.forEach(([key, obj]) => {
      if(obj && obj.date && obj.time){
        allSessions.push({
          round: r.round, raceName: r.raceName, circuit: r.Circuit.circuitName,
          country: r.Circuit.Location.country, key, name: SESSION_LABELS[key] || key,
          dt: toKST(obj.date, obj.time)
        });
      }
    });
  });
  allSessions.sort((a,b) => a.dt - b.dt);
  nextSession = allSessions.find(s => s.dt > now) || null;

  renderCountdown();
  renderSchedule(now);
  if(nextSession) setInterval(renderCountdown, 1000);
}

function renderCountdown(){
  const el = document.getElementById("countdown-body");
  if(!nextSession){
    el.innerHTML = `<div class="muted">다음 예정 세션이 없습니다 (시즌 종료).</div>`;
    return;
  }
  const now = new Date();
  if(nextSession.dt <= now){
    // Session passed while tab was open — advance to the next upcoming one.
    const upcoming = allSessions.find(s => s.dt > now);
    if(upcoming && upcoming !== nextSession){
      nextSession = upcoming;
      notifyStatusMsg = "";
      renderSchedule(now);
    }
  }
  const diff = Math.max(0, nextSession.dt - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  el.innerHTML = `
    <div class="countdown-race">Round ${nextSession.round} · ${nextSession.raceName}</div>
    <div class="countdown-session">${nextSession.name} 세션까지</div>
    <div class="countdown-timer">
      <div class="cbox"><div class="num">${d}</div><div class="lbl">일</div></div>
      <div class="cbox"><div class="num">${String(h).padStart(2,'0')}</div><div class="lbl">시간</div></div>
      <div class="cbox"><div class="num">${String(m).padStart(2,'0')}</div><div class="lbl">분</div></div>
      <div class="cbox"><div class="num">${String(s).padStart(2,'0')}</div><div class="lbl">초</div></div>
    </div>
    <div class="kst-time">📅 ${fmtKST(nextSession.dt)} · ${nextSession.circuit} (${nextSession.country})</div>
    <div class="notify-row">
      <button id="notify-btn">🔔 이 세션 알림 켜기 (1시간 전 / 10분 전)</button>
      <button id="notify-test" class="secondary">알림 테스트</button>
    </div>
    <div class="notify-status" id="notify-status">${notifyStatusMsg}</div>
  `;
  document.getElementById("notify-btn").onclick = enableNotifications;
  document.getElementById("notify-test").onclick = () => sendNotification("F1 KST 알림 테스트", "알림이 정상적으로 도착했습니다 🏁");
}

let notifyTimers = [];
function setNotifyStatus(msg){
  notifyStatusMsg = msg;
  const el = document.getElementById("notify-status");
  if(el) el.textContent = msg;
}
function sendNotification(title, body){
  if(!("Notification" in window)){ alert(title + "\n" + body); return; }
  if(Notification.permission === "granted"){
    new Notification(title, { body });
  } else {
    alert(title + "\n" + body);
  }
}
async function enableNotifications(){
  if(!("Notification" in window)){
    setNotifyStatus("이 브라우저는 알림을 지원하지 않습니다.");
    return;
  }
  const perm = await Notification.requestPermission();
  if(perm !== "granted"){
    setNotifyStatus("알림 권한이 거부되었습니다.");
    return;
  }
  notifyTimers.forEach(t => clearTimeout(t));
  notifyTimers = [];
  const targetSession = nextSession;
  const now = new Date();
  const points = [
    { label: "1시간 전", ms: targetSession.dt - 60*60*1000 },
    { label: "10분 전", ms: targetSession.dt - 10*60*1000 },
  ];
  let scheduled = 0;
  points.forEach(p => {
    const delay = p.ms - now;
    if(delay > 0){
      scheduled++;
      notifyTimers.push(setTimeout(() => {
        sendNotification(`${targetSession.raceName} · ${targetSession.name}`, `${p.label} 알림입니다. (${fmtKST(targetSession.dt)})`);
      }, delay));
    }
  });
  setNotifyStatus(scheduled > 0
    ? `알림 ${scheduled}건 예약됨 (이 탭을 열어두어야 정상 작동, 프로토타입 한계)`
    : "이미 알림 시점이 지났습니다.");
}

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

async function loadStandings(){
  try{
    const [dData, cData] = await Promise.all([
      fetchJSON(`${API}/current/driverstandings.json`),
      fetchJSON(`${API}/current/constructorstandings.json`),
    ]);
    const dList = dData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
    const cList = cData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];

    document.getElementById("drivers-body").innerHTML = `
      <table>
        <thead><tr><th>순위</th><th>드라이버</th><th>팀</th><th class="pts">포인트</th><th class="pts">우승</th></tr></thead>
        <tbody>
          ${dList.map(d => `
            <tr>
              <td class="pos">${d.position}</td>
              <td><span class="team-dot" style="background:${TEAM_COLORS[d.Constructors[0].constructorId] || '#888'}"></span>${d.Driver.givenName} ${d.Driver.familyName}</td>
              <td class="muted">${d.Constructors[0].name}</td>
              <td class="pts">${d.points}</td>
              <td class="pts">${d.wins}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;

    document.getElementById("constructors-body").innerHTML = `
      <table>
        <thead><tr><th>순위</th><th>팀</th><th class="pts">포인트</th><th class="pts">우승</th></tr></thead>
        <tbody>
          ${cList.map(c => `
            <tr>
              <td class="pos">${c.position}</td>
              <td><span class="team-dot" style="background:${TEAM_COLORS[c.Constructor.constructorId] || '#888'}"></span>${c.Constructor.name}</td>
              <td class="pts">${c.points}</td>
              <td class="pts">${c.wins}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }catch(e){
    document.getElementById("drivers-body").innerHTML = `<div class="err">순위 데이터를 불러오지 못했습니다: ${e.message}</div>`;
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("drivers-body").classList.toggle("hidden", target !== "drivers");
    document.getElementById("constructors-body").classList.toggle("hidden", target !== "constructors");
  });
});

loadSchedule().catch(e => {
  document.getElementById("countdown-body").innerHTML = `<div class="err">일정 데이터를 불러오지 못했습니다: ${e.message}</div>`;
  document.getElementById("schedule-body").innerHTML = `<div class="err">CORS 또는 네트워크 문제일 수 있습니다. 로컬 서버(예: python -m http.server)로 열어보세요.</div>`;
});
loadStandings();
}
