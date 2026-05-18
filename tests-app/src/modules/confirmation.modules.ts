// Confirmation modullari uchun parity scenariolari.
// Laravel: Modules/Confirmation — 7 ta controller, ~30 endpoint.

import type { ModuleDefinition } from '@/configs/types';

const PAGE_IGNORE = ['data.per_page', 'data.total', 'data.data'];

// ============================================================
// /api/v1/confirmation/* — list endpoints (contracts, commands, ...)
// ============================================================
export const confirmationListsModule: ModuleDefinition = {
  name: 'confirmation-lists',
  tags: ['confirmation'],
  basePath: '/api/v1/confirmation',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'contracts list',
      tags: ['list'],
      request: { method: 'GET', path: '/contracts', query: { per_page: 3 } },
    },
    {
      name: 'commands list',
      tags: ['list'],
      request: { method: 'GET', path: '/commands', query: { per_page: 3 } },
    },
    {
      name: 'contract-additional list',
      tags: ['list'],
      request: { method: 'GET', path: '/contract-additional', query: { per_page: 3 } },
    },
    {
      name: 'timesheet confirmations list',
      tags: ['list'],
      request: { method: 'GET', path: '/timesheet', query: { per_page: 3 } },
    },
    {
      name: 'vacation-schedule confirmations list',
      tags: ['list'],
      request: { method: 'GET', path: '/vacation-schedule', query: { per_page: 3 } },
    },
    {
      name: 'protocol confirmations list',
      tags: ['list'],
      request: { method: 'GET', path: '/protocol', query: { per_page: 3 } },
    },
    {
      name: 'certificates confirmations list',
      tags: ['list'],
      request: { method: 'GET', path: '/certificates', query: { per_page: 3 } },
    },
    {
      name: 'staffing-approve list',
      tags: ['list'],
      request: { method: 'GET', path: '/staffing-approve', query: { per_page: 3 } },
    },
    {
      name: 'reports list',
      tags: ['list'],
      request: { method: 'GET', path: '/reports', query: { per_page: 3 } },
    },
    {
      name: 'applications (apiResource) list',
      tags: ['list'],
      request: { method: 'GET', path: '/applications', query: { per_page: 3 } },
    },
  ],
};

// ============================================================
// /api/v1/worker-application/* — statistics + applications CRUD
// ============================================================
export const confirmationWorkerApplicationModule: ModuleDefinition = {
  name: 'confirmation-worker-application',
  tags: ['confirmation'],
  basePath: '/api/v1/worker-application',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'statistics',
      tags: ['list'],
      request: { method: 'GET', path: '/statistics' },
    },
    {
      name: 'directors',
      tags: ['list'],
      request: { method: 'GET', path: '/directors' },
    },
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
    },
    {
      name: 'confirmations',
      tags: ['list'],
      request: { method: 'GET', path: '/confirmations' },
    },
    {
      name: 'positions',
      tags: ['list'],
      request: { method: 'GET', path: '/positions' },
    },
    {
      name: 'temporarily-workers',
      tags: ['list'],
      request: { method: 'GET', path: '/temporarily-workers' },
    },
  ],
};

// ============================================================
// /api/v1/document/*
// ============================================================
export const confirmationDocumentModule: ModuleDefinition = {
  name: 'confirmation-document',
  tags: ['confirmation'],
  basePath: '/api/v1/document',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'show (missing query → 422 or empty)',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/show' },
      statusOnly: true,
    },
    {
      name: 'history (missing query → 422 or empty)',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/history' },
      statusOnly: true,
    },
    {
      name: 'files list',
      tags: ['list'],
      request: { method: 'GET', path: '/files', query: { per_page: 3 } },
    },
    {
      name: 'applications list',
      tags: ['list'],
      request: { method: 'GET', path: '/applications', query: { per_page: 3 } },
    },
    {
      name: 'chat users',
      tags: ['list'],
      request: { method: 'GET', path: '/users' },
    },
    {
      name: 'chat messages (no doc id → empty/422)',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/messages' },
      statusOnly: true,
    },
    {
      name: 'generate-url (no doc id → 422)',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/generate-url' },
      statusOnly: true,
    },
  ],
};
