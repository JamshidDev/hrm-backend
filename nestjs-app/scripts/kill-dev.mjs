#!/usr/bin/env node
// kill-dev — eski watch process'larni (orphan, zombie) butun daraxti bilan o'ldiradi.
//
// Sabab: oddiy `kill-port 8001` faqat port'da turgan `node main.ts`'ni o'ldiradi.
// Ammo uning parent'i `nest start --watch` CLI watcher hali tirik qoladi va
// fayllarni kuzatishda davom etadi → RAM zombie.
//
// Bu skript:
//   1. 8001 port'da turgan process'ni topib o'ldiradi (lsof)
//   2. "nest start" pattern bo'yicha BARCHA nest watch CLI'larni o'ldiradi
//   3. Ularning parent shell wrapper'lari (sh -c ...) ham ketadi
//   4. Tirik qolgan kontroller process'larni tekshirib chiqadi
//
// Ishlatish:
//   pnpm kill:port          — start:dev'dan oldin chaqiriladi (avtomatik)
//   pnpm dev:clean          — qo'lda chaqirib hammasini tozalash

import { execSync } from 'node:child_process';

const PORT = Number(process.env.APP_PORT) || 8001;

/** Berilgan PID'ga signal yuboradi. Xato bo'lsa silent. */
function kill(pid, signal = 'SIGTERM') {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/** Berilgan portda LISTEN qilayotgan PID'lar. */
function pidsOnPort(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split('\n')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

/** Pattern bo'yicha process'larni topish (ps -ef + grep). */
function pidsMatching(pattern) {
  try {
    const out = execSync(
      `ps -axo pid,command | grep -E ${JSON.stringify(pattern)} | grep -v grep | awk '{print $1}'`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], shell: '/bin/bash' },
    );
    return out
      .split('\n')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n !== process.pid);
  } catch {
    return [];
  }
}

/** Berilgan PID'ning parent (PPID) PID'larini topadi. */
function getParentPid(pid) {
  try {
    const out = execSync(`ps -o ppid= -p ${pid}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const ppid = Number(out.trim());
    return Number.isFinite(ppid) && ppid > 1 ? ppid : null;
  } catch {
    return null;
  }
}

/** Berilgan PID'ning butun dasht (descendants) PID'larini topadi. */
function collectTree(rootPid) {
  const queue = [rootPid];
  const seen = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    try {
      const childOut = execSync(`pgrep -P ${current}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      queue.push(
        ...childOut
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
      );
    } catch {
      // children yo'q
    }
  }
  return [...seen];
}

// O'zimiz va ancestor (pnpm wrapper) PID'larini hech qachon o'ldirmaymiz.
// Aks holda kill-dev o'zining parent pnpm/sh'ini o'ldirib, hozirgi `pnpm start:dev`
// chain'ini buzadi.
const SELF_AND_ANCESTORS = new Set();
{
  let p = process.pid;
  while (p && p !== 1) {
    SELF_AND_ANCESTORS.add(p);
    p = getParentPid(p);
  }
}

const ALL_KILL_PIDS = new Set();
function scheduleKill(rootPid) {
  for (const p of collectTree(rootPid)) {
    if (SELF_AND_ANCESTORS.has(p)) continue;
    ALL_KILL_PIDS.add(p);
  }
}

// 1. Port'da turgan process'larni topish + ularning butun parent tree'sini
const portPids = pidsOnPort(PORT);
for (const pid of portPids) {
  // Parent shell wrapper bo'lsa, undan boshlab butun tree'ni o'ldiramiz
  let root = pid;
  // 2 daraja yuqori chiqib root'ni topamiz (sh -c wrapper)
  for (let i = 0; i < 2; i++) {
    const parent = getParentPid(root);
    if (parent && parent !== 1) root = parent;
    else break;
  }
  scheduleKill(root);
}

// 2. Pattern bo'yicha orphan `nest CLI` watcher'lar.
// `nestjs\\+cli` — haqiqiy nest CLI process'i (node /.../@nestjs+cli/bin/nest.js).
// Sh wrapper'lar (sh -c "pnpm kill:port && nest start") topilmaydi — bu ataylab,
// chunki ular hozirgi bash chain'imizning bir qismi bo'lishi mumkin.
const nestWatchers = pidsMatching('nestjs.cli/bin/nest|@nestjs.cli');
for (const pid of nestWatchers) {
  scheduleKill(pid);
}

// 3. `tsc --watch` daemon'lar (agar bo'lsa)
for (const pid of pidsMatching('tsc.*--watch')) {
  scheduleKill(pid);
}

// === O'LDIRISH ===
// Avval SIGTERM (graceful) — main.ts handler'i toza yopadi
for (const p of ALL_KILL_PIDS) kill(p, 'SIGTERM');

// 800ms kutamiz — ya'ni async, node skripti exit qilmaydi
await new Promise((r) => setTimeout(r, 800));

// Hali tirik qolganlarga SIGKILL — wrapper shell'lar (sh -c, pnpm wrap)
let remaining = 0;
for (const p of ALL_KILL_PIDS) {
  try {
    // signal 0 — faqat tirik yoki yo'qligini tekshiradi
    process.kill(p, 0);
    kill(p, 'SIGKILL');
    remaining++;
  } catch {
    // allaqachon o'lgan
  }
}

console.log(
  `[kill-dev] port ${PORT}: ${portPids.length} listener · nest watcher: ${nestWatchers.length} · tree pids: ${ALL_KILL_PIDS.size} · SIGKILL'ga qolgan: ${remaining}`,
);
