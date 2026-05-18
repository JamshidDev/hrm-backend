// CLI entry point. Foydalanish:
//   pnpm test:parity                  — barcha modullar
//   pnpm test:parity regions          — bitta modul
//   pnpm test:parity --tag pagination — tag bo'yicha
//   pnpm test:parity --fail-fast      — birinchi failure'da to'xtash

import { Command } from 'commander';
import chalk from 'chalk';
import { runModules } from '@/core/runner';
import { reporter } from '@/reporters/terminal.reporter';
import { ALL_MODULES } from '@/configs/modules.config';
import type { ScenarioTag } from '@/configs/types';

const VALID_TAGS: ScenarioTag[] = [
  'list',
  'detail',
  'create',
  'update',
  'delete',
  'pagination',
  'validation',
  'auth',
  'permission',
  'filter',
  'sorting',
  'soft-delete',
  'concurrency',
  'upload',
];

const program = new Command();

program
  .name('test:parity')
  .description('Laravel ↔ NestJS parity testing platform')
  .argument('[module]', 'Module name (or "all"). Omit to run all.')
  .option('--tag <tags>', 'Filter scenarios by tags (comma-separated)', '')
  .option('--module-tag <tag>', 'Filter modules by group (e.g. structure, admin)')
  .option('--fail-fast', 'Stop on first failure', false)
  .option('--verbose', 'Show full diff output', false)
  .option('--json', 'Write JSON report to results/', false)
  .action(async (moduleArg: string | undefined, opts) => {
    try {
      const moduleName =
        moduleArg && moduleArg !== 'all' ? moduleArg : undefined;

      const tagsRaw = (opts.tag as string).trim();
      const tags = tagsRaw
        ? (tagsRaw.split(',').map((t) => t.trim()) as ScenarioTag[])
        : undefined;

      // Tag validation.
      if (tags) {
        const invalid = tags.filter((t) => !VALID_TAGS.includes(t));
        if (invalid.length > 0) {
          console.error(
            chalk.red(
              `Invalid tag(s): ${invalid.join(', ')}. Valid: ${VALID_TAGS.join(', ')}`,
            ),
          );
          process.exit(2);
        }
      }

      const result = await runModules(ALL_MODULES, {
        moduleName,
        tags,
        moduleTag: opts.moduleTag,
        failFast: !!opts.failFast,
        verbose: !!opts.verbose,
        json: !!opts.json,
      });

      reporter.finalSummary(result);

      // JSON report — agar so'ralsa.
      if (opts.json) {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const reportDir = path.resolve(process.cwd(), 'results');
        await fs.mkdir(reportDir, { recursive: true });
        const fileName = `parity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(reportDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(result, null, 2));
        console.log(chalk.dim(`JSON report: ${filePath}`));
      }

      // Exit code — fail bo'lsa 1.
      const hasFailures = result.testsFailed + result.testsErrored > 0;
      process.exit(hasFailures ? 1 : 0);
    } catch (err) {
      console.error(chalk.red('\n[FATAL]'), err instanceof Error ? err.message : err);
      if (err instanceof Error && err.stack) {
        console.error(chalk.dim(err.stack));
      }
      process.exit(2);
    }
  });

program.parseAsync(process.argv);
