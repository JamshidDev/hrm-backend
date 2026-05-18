// Terminal reporter — colored module-by-module + final summary table.

import chalk from 'chalk';
import type {
  DiffEntry,
  FinalResult,
  ModuleResult,
  ScenarioResult,
} from '@/configs/types';

// Box width — module sectionlari uchun ichki content kengligi.
const BOX_INNER = 68; // 70 jami minus 2 ta border ('│ ' va ' │' chiqarib).

// ANSI escape sequences'ni olib tashlash — visible length hisoblash uchun.
// `` = ESC.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\[\d+(?:;\d+)*m/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

// ---- Reporter API ----

export const reporter = {
  // Run boshlanishi.
  runStart(modules: string[], filters: { tags?: string[]; moduleTag?: string }): void {
    const total = modules.length;
    console.log();
    console.log(chalk.bold.cyan('Laravel ↔ NestJS Parity Tests'));
    let meta = chalk.dim(`Modules: ${total}`);
    if (filters.moduleTag) meta += chalk.dim(`  ·  group: ${filters.moduleTag}`);
    if (filters.tags?.length)
      meta += chalk.dim(`  ·  tags: ${filters.tags.join(',')}`);
    console.log(meta);
  },

  // Modul boshlanishi.
  moduleStart(name: string): void {
    console.log();
    console.log(chalk.dim('┌' + '─'.repeat(BOX_INNER + 2) + '┐'));
    printInsideBox(chalk.bold.cyan(name));
    console.log(chalk.dim('├' + '─'.repeat(BOX_INNER + 2) + '┤'));
  },

  // Bitta scenariy natija.
  scenario(result: ScenarioResult, verbose: boolean): void {
    const duration = chalk.dim(`${result.durationMs}ms`.padStart(7));
    const namePart = truncate(result.scenario, 50);

    if (result.status === 'pass') {
      // " ✓ " (3) + name (50) + 3 sep + duration (7) = 63, BOX_INNER = 68 → 5 padding
      printInsideBox(
        chalk.green(' ✓ ') +
          namePart.padEnd(50) +
          '   ' +
          duration,
      );
    } else if (result.status === 'skip') {
      printInsideBox(
        chalk.yellow(' ○ ') +
          chalk.dim(namePart.padEnd(50)) +
          chalk.yellow('     skip'),
      );
      if (result.reason) {
        for (const line of wrapText(`↳ ${result.reason}`, 60)) {
          printInsideBox(chalk.dim('     ' + line));
        }
      }
    } else if (result.status === 'error') {
      printInsideBox(
        chalk.red.bold(' ! ') +
          namePart.padEnd(50) +
          chalk.red.bold('      ERR'),
      );
      if (result.reason) {
        for (const line of wrapText(result.reason, 60)) {
          printInsideBox(chalk.red('     ' + line));
        }
      }
    } else {
      // fail
      printInsideBox(
        chalk.red(' ✗ ') +
          namePart.padEnd(50) +
          chalk.red('     FAIL'),
      );
      if (result.laravelStatus !== undefined && result.nestjsStatus !== undefined) {
        if (result.laravelStatus !== result.nestjsStatus) {
          printInsideBox(
            chalk.red(
              `     Status: Laravel=${result.laravelStatus}, NestJS=${result.nestjsStatus}`,
            ),
          );
        }
      }
      if (result.diff && result.diff.length > 0) {
        const showCount = verbose
          ? result.diff.length
          : Math.min(3, result.diff.length);
        for (let i = 0; i < showCount; i++) {
          printDiff(result.diff[i]);
        }
        if (!verbose && result.diff.length > showCount) {
          printInsideBox(
            chalk.dim(
              `     ... and ${result.diff.length - showCount} more (--verbose)`,
            ),
          );
        }
      }
    }
  },

  // Modul yakuni — bo'limni yopadi.
  moduleEnd(result: ModuleResult): void {
    console.log(chalk.dim('├' + '─'.repeat(BOX_INNER + 2) + '┤'));

    const total = result.passed + result.failed + result.errored;
    const ratio = `${result.passed}/${total}`;
    const ratioColored =
      result.failed + result.errored === 0 ? chalk.green(ratio) : chalk.red(ratio);

    const skipped =
      result.skipped > 0
        ? chalk.yellow(`${result.skipped} skipped`)
        : chalk.dim('0 skipped');

    const duration = chalk.dim(formatDuration(result.durationMs));

    printInsideBox(`Result: ${ratioColored}  ·  ${skipped}  ·  ${duration}`);
    console.log(chalk.dim('└' + '─'.repeat(BOX_INNER + 2) + '┘'));
  },

  // Yakuniy summary — jadval ko'rinishida.
  finalSummary(result: FinalResult): void {
    console.log();
    renderFinalTable(result);
    console.log();
    renderFinalBanner(result);
    console.log();
  },
};

// ---- Helpers ----

function printDiff(d: DiffEntry): void {
  printInsideBox(chalk.red(`   Field mismatch:`));
  printInsideBox(`     path:    ${chalk.cyan(d.path)}`);
  if (d.kind === 'missing-laravel') {
    printInsideBox(`     ${chalk.dim('Laravel:')} ${chalk.dim('<missing>')}`);
    printInsideBox(`     ${chalk.dim('NestJS: ')} ${formatValue(d.nestjs)}`);
  } else if (d.kind === 'missing-nestjs') {
    printInsideBox(`     ${chalk.dim('Laravel:')} ${formatValue(d.laravel)}`);
    printInsideBox(`     ${chalk.dim('NestJS: ')} ${chalk.dim('<missing>')}`);
  } else {
    printInsideBox(`     ${chalk.dim('Laravel:')} ${formatValue(d.laravel)}`);
    printInsideBox(`     ${chalk.dim('NestJS: ')} ${formatValue(d.nestjs)}`);
  }
}

// Box ichida tekstni chiqaradi — ANSI codes hisobga olib, padding to'g'ri.
function printInsideBox(content: string): void {
  const visible = stripAnsi(content);
  let body = content;
  if (visible.length > BOX_INNER) {
    // Truncate (rare — caller'lar wrap qilishi kerak).
    body = content.slice(0, content.length - (visible.length - BOX_INNER + 3)) + '...';
  }
  const visLen = stripAnsi(body).length;
  const padding = ' '.repeat(Math.max(0, BOX_INNER - visLen));
  console.log(chalk.dim('│ ') + body + padding + chalk.dim(' │'));
}

// Long text'ni `width` chegarasi bo'yicha satrlarga bo'lish.
function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length === 0 ? [''] : lines;
}

function formatValue(v: unknown): string {
  if (v === null) return chalk.dim('null');
  if (v === undefined) return chalk.dim('undefined');
  if (typeof v === 'string') return chalk.green(`"${truncate(v, 50)}"`);
  if (typeof v === 'number' || typeof v === 'boolean')
    return chalk.yellow(String(v));
  if (typeof v === 'object') {
    return chalk.dim(truncate(JSON.stringify(v), 60));
  }
  return String(v);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---- Final summary table ----

function renderFinalTable(result: FinalResult): void {
  const cols = {
    module: 24,
    passed: 9,
    failed: 9,
    skipped: 10,
    duration: 11,
  };

  const top = `┌${'─'.repeat(cols.module + 2)}┬${'─'.repeat(cols.passed + 2)}┬${'─'.repeat(cols.failed + 2)}┬${'─'.repeat(cols.skipped + 2)}┬${'─'.repeat(cols.duration + 2)}┐`;
  const mid = `├${'─'.repeat(cols.module + 2)}┼${'─'.repeat(cols.passed + 2)}┼${'─'.repeat(cols.failed + 2)}┼${'─'.repeat(cols.skipped + 2)}┼${'─'.repeat(cols.duration + 2)}┤`;
  const bot = `└${'─'.repeat(cols.module + 2)}┴${'─'.repeat(cols.passed + 2)}┴${'─'.repeat(cols.failed + 2)}┴${'─'.repeat(cols.skipped + 2)}┴${'─'.repeat(cols.duration + 2)}┘`;
  const v = chalk.dim('│');

  console.log(chalk.dim(top));
  console.log(
    `${v} ${chalk.bold('Module'.padEnd(cols.module))} ${v} ${chalk.bold('Passed'.padStart(cols.passed))} ${v} ${chalk.bold('Failed'.padStart(cols.failed))} ${v} ${chalk.bold('Skipped'.padStart(cols.skipped))} ${v} ${chalk.bold('Duration'.padStart(cols.duration))} ${v}`,
  );
  console.log(chalk.dim(mid));

  for (const m of result.modules) {
    console.log(renderRow(m, cols));
  }

  console.log(chalk.dim(mid));
  console.log(renderTotalRow(result, cols));
  console.log(chalk.dim(bot));
}

function renderRow(
  m: ModuleResult,
  cols: { module: number; passed: number; failed: number; skipped: number; duration: number },
): string {
  const v = chalk.dim('│');
  const total = m.passed + m.failed + m.errored;
  const passRatio = `${m.passed}/${total}`;
  const failed = m.failed + m.errored;

  const moduleCol = chalk.cyan(m.module.padEnd(cols.module));
  const passColor =
    m.passed === total ? chalk.green : m.passed > 0 ? chalk.yellow : chalk.red;
  const passCol = passColor(passRatio.padStart(cols.passed));

  const failColor = failed > 0 ? chalk.red : chalk.dim;
  const failCol = failColor(String(failed).padStart(cols.failed));

  const skipColor = m.skipped > 0 ? chalk.yellow : chalk.dim;
  const skipCol = skipColor(String(m.skipped).padStart(cols.skipped));

  const durCol = chalk.dim(formatDuration(m.durationMs).padStart(cols.duration));

  return `${v} ${moduleCol} ${v} ${passCol} ${v} ${failCol} ${v} ${skipCol} ${v} ${durCol} ${v}`;
}

function renderTotalRow(
  result: FinalResult,
  cols: { module: number; passed: number; failed: number; skipped: number; duration: number },
): string {
  const v = chalk.dim('│');
  // Skipped'ni "passed of total" hisobiga kiritmaymiz.
  const ranTotal = result.testsTotal - result.testsSkipped;
  const passRatio = `${result.testsPassed}/${ranTotal}`;
  const failed = result.testsFailed + result.testsErrored;

  const moduleCol = chalk.bold('TOTAL'.padEnd(cols.module));
  const passColor =
    failed === 0 ? chalk.green : result.testsPassed > 0 ? chalk.yellow : chalk.red;
  const passCol = chalk.bold(passColor(passRatio.padStart(cols.passed)));
  const failColor = failed > 0 ? chalk.red : chalk.dim;
  const failCol = chalk.bold(failColor(String(failed).padStart(cols.failed)));
  const skipColor = result.testsSkipped > 0 ? chalk.yellow : chalk.dim;
  const skipCol = chalk.bold(
    skipColor(String(result.testsSkipped).padStart(cols.skipped)),
  );
  const durCol = chalk.bold.dim(
    formatDuration(result.durationMs).padStart(cols.duration),
  );

  return `${v} ${moduleCol} ${v} ${passCol} ${v} ${failCol} ${v} ${skipCol} ${v} ${durCol} ${v}`;
}

function renderFinalBanner(result: FinalResult): void {
  const failed = result.testsFailed + result.testsErrored;
  const dur = formatDuration(result.durationMs);

  if (failed === 0 && result.modulesFailed === 0) {
    const skipNote =
      result.testsSkipped > 0
        ? chalk.yellow(`  (${result.testsSkipped} skipped)`)
        : '';
    console.log(
      chalk.bold.green('✅  ALL MODULES PASSED') +
        skipNote +
        chalk.dim(`  (${dur})`),
    );
  } else {
    console.log(
      chalk.bold.red(
        `❌  ${result.modulesFailed} module${result.modulesFailed === 1 ? '' : 's'} FAILED`,
      ) + chalk.dim(`  (${dur})`),
    );
    console.log();
    console.log(chalk.red('Failed modules:'));
    for (const m of result.modules) {
      if (m.failed + m.errored > 0) {
        console.log(
          chalk.red(`  • ${m.module}`) +
            chalk.dim(` — ${m.failed + m.errored} failed`),
        );
      }
    }
  }
}
