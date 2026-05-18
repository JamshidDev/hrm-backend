// Test runner — module va scenariolarni ishga tushiradi, natijalarni yig'adi.
// Sequential default. Parallel kelajakda qo'shiladi.

import { compare } from '@/comparators/diff';
import { reporter } from '@/reporters/terminal.reporter';
import { tokensFor } from '@/auth/auth';
import { request } from '@/helpers/http.client';
import type {
  FinalResult,
  ModuleDefinition,
  ModuleResult,
  RunOptions,
  Scenario,
  ScenarioResult,
} from '@/configs/types';

export async function runModules(
  modules: ModuleDefinition[],
  options: RunOptions,
): Promise<FinalResult> {
  const overallStart = Date.now();
  // Filter — module nomi yoki module tag.
  let selected = modules;
  if (options.moduleName) {
    selected = modules.filter((m) => m.name === options.moduleName);
    if (selected.length === 0) {
      throw new Error(
        `Module not found: ${options.moduleName}. Available: ${modules.map((m) => m.name).join(', ')}`,
      );
    }
  } else if (options.moduleTag) {
    selected = modules.filter((m) => m.tags.includes(options.moduleTag!));
  }

  reporter.runStart(selected.map((m) => m.name), {
    tags: options.tags,
    moduleTag: options.moduleTag,
  });

  const moduleResults: ModuleResult[] = [];
  let stopRequested = false;

  for (const mod of selected) {
    if (stopRequested) break;
    const result = await runModule(mod, options);
    moduleResults.push(result);

    if (options.failFast && result.failed + result.errored > 0) {
      stopRequested = true;
    }
  }

  // Aggregate.
  let testsTotal = 0;
  let testsPassed = 0;
  let testsFailed = 0;
  let testsSkipped = 0;
  let testsErrored = 0;
  let modulesFailed = 0;

  for (const m of moduleResults) {
    testsTotal += m.passed + m.failed + m.skipped + m.errored;
    testsPassed += m.passed;
    testsFailed += m.failed;
    testsSkipped += m.skipped;
    testsErrored += m.errored;
    if (m.failed + m.errored > 0) modulesFailed++;
  }

  return {
    modulesTotal: moduleResults.length,
    modulesPassed: moduleResults.length - modulesFailed,
    modulesFailed,
    testsTotal,
    testsPassed,
    testsFailed,
    testsSkipped,
    testsErrored,
    durationMs: Date.now() - overallStart,
    modules: moduleResults,
  };
}

async function runModule(
  mod: ModuleDefinition,
  options: RunOptions,
): Promise<ModuleResult> {
  reporter.moduleStart(mod.name);
  const moduleStart = Date.now();

  // Tag filter.
  let scenarios = mod.scenarios;
  if (options.tags && options.tags.length > 0) {
    scenarios = scenarios.filter((s) =>
      s.tags.some((t) => options.tags!.includes(t)),
    );
  }

  const results: ScenarioResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errored = 0;

  for (const scenario of scenarios) {
    const result = await runScenario(mod, scenario);
    results.push(result);
    reporter.scenario(result, options.verbose);

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;
    else if (result.status === 'skip') skipped++;
    else if (result.status === 'error') errored++;

    if (options.failFast && (result.status === 'fail' || result.status === 'error')) {
      break;
    }
  }

  const moduleResult: ModuleResult = {
    module: mod.name,
    passed,
    failed,
    skipped,
    errored,
    durationMs: Date.now() - moduleStart,
    scenarios: results,
  };
  reporter.moduleEnd(moduleResult);
  return moduleResult;
}

async function runScenario(
  mod: ModuleDefinition,
  scenario: Scenario,
): Promise<ScenarioResult> {
  const start = Date.now();

  if (scenario.skip) {
    return {
      module: mod.name,
      scenario: scenario.name,
      tags: scenario.tags,
      status: 'skip',
      durationMs: 0,
      reason: scenario.skip,
    };
  }

  try {
    const auth = scenario.request.auth ?? mod.defaultAuth;
    const tokens = await tokensFor(auth);

    const path = buildPath(mod.basePath, scenario);

    const [laravel, nestjs] = await Promise.all([
      request('laravel', {
        method: scenario.request.method,
        path,
        body: scenario.request.body,
        token: tokens?.laravel,
      }),
      request('nestjs', {
        method: scenario.request.method,
        path,
        body: scenario.request.body,
        token: tokens?.nestjs,
      }),
    ]);

    const expectStatus = scenario.expectStatus ?? 200;

    // Status code tekshiruvi — ikkalasi parity'da farq qilsa fail.
    if (laravel.status !== nestjs.status) {
      return {
        module: mod.name,
        scenario: scenario.name,
        tags: scenario.tags,
        status: 'fail',
        durationMs: Date.now() - start,
        laravelStatus: laravel.status,
        nestjsStatus: nestjs.status,
        reason: `Status mismatch (expected ${expectStatus})`,
      };
    }

    // statusOnly — body solishtirilmaydi (validation error testlari uchun).
    if (scenario.statusOnly) {
      return {
        module: mod.name,
        scenario: scenario.name,
        tags: scenario.tags,
        status: laravel.status === expectStatus ? 'pass' : 'fail',
        durationMs: Date.now() - start,
        laravelStatus: laravel.status,
        nestjsStatus: nestjs.status,
        reason:
          laravel.status === expectStatus
            ? undefined
            : `Expected ${expectStatus}, got ${laravel.status}`,
      };
    }

    // Response body solishtirish.
    const ignorePaths = [
      ...(mod.ignorePaths ?? []),
      ...(scenario.ignorePaths ?? []),
    ];
    const maskPaths = mod.maskPaths ?? [];
    const diffs = compare(laravel.data, nestjs.data, ignorePaths, maskPaths);

    if (diffs.length === 0) {
      return {
        module: mod.name,
        scenario: scenario.name,
        tags: scenario.tags,
        status: 'pass',
        durationMs: Date.now() - start,
        laravelStatus: laravel.status,
        nestjsStatus: nestjs.status,
      };
    }

    return {
      module: mod.name,
      scenario: scenario.name,
      tags: scenario.tags,
      status: 'fail',
      durationMs: Date.now() - start,
      laravelStatus: laravel.status,
      nestjsStatus: nestjs.status,
      diff: diffs,
    };
  } catch (err) {
    return {
      module: mod.name,
      scenario: scenario.name,
      tags: scenario.tags,
      status: 'error',
      durationMs: Date.now() - start,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildPath(basePath: string, scenario: Scenario): string {
  let path = basePath;

  // Scenario.path qo'shimcha — '/:id', '?per_page=3', va h.k.
  if (scenario.request.path) {
    path += scenario.request.path;
  }

  // Path params substitute.
  if (scenario.request.pathParams) {
    for (const [key, value] of Object.entries(scenario.request.pathParams)) {
      path = path.replace(`:${key}`, value);
    }
  }

  // Query params (path string'ga qo'shilmagan bo'lsa).
  if (scenario.request.query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(scenario.request.query)) {
      qs.append(k, String(v));
    }
    path += (path.includes('?') ? '&' : '?') + qs.toString();
  }

  return path;
}
