// Drizzle relations — qo'lda yozilgan, kerakli jadvallarni qamrab oladi.
// drizzle-kit pull avto-generate qilgani buzuq (~450 ta yo'q reference) — ishonchsiz.
// Yangi modul qo'shilganda — kerakli relation'larni shu joyga qo'shamiz.
//
// MUHIM: `pnpm db:pull` ishlatsangiz, drizzle-kit bu faylni qayta yozadi.
// `git restore src/db/relations.ts` bilan tiklang.

import { defineRelations } from 'drizzle-orm';
import * as schema from '@/db/schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    worker: r.one.workers({
      from: r.users.worker_id,
      to: r.workers.id,
    }),
    organization: r.one.organizations({
      from: r.users.organization_id,
      to: r.organizations.id,
    }),
    personal_access_tokens: r.many.personal_access_tokens({
      from: r.users.id,
      to: r.personal_access_tokens.tokenable_id,
    }),
    user_telegrams: r.many.user_telegrams({
      from: r.users.id,
      to: r.user_telegrams.user_id,
    }),
    oauth_client_codes: r.many.oauth_client_codes({
      from: r.users.id,
      to: r.oauth_client_codes.user_id,
    }),
    // Spatie: many-to-many users ↔ roles via model_has_roles
    roles: r.many.roles({
      from: r.users.id.through(r.model_has_roles.model_id),
      to: r.roles.id.through(r.model_has_roles.role_id),
    }),
    // Spatie: many-to-many users ↔ permissions (direct) via model_has_permissions
    direct_permissions: r.many.permissions({
      from: r.users.id.through(r.model_has_permissions.model_id),
      to: r.permissions.id.through(r.model_has_permissions.permission_id),
      alias: 'users__direct_permissions',
    }),
  },

  workers: {
    user: r.one.users({
      from: r.workers.id,
      to: r.users.worker_id,
    }),
  },

  organizations: {
    users: r.many.users({
      from: r.organizations.id,
      to: r.users.organization_id,
    }),
    // Structure module — city.region.country eager load.
    city: r.one.cities({
      from: r.organizations.city_id,
      to: r.cities.id,
    }),
    // Tree: parent / children (parent_id chain).
    parent: r.one.organizations({
      from: r.organizations.parent_id,
      to: r.organizations.id,
      alias: 'organizations__parent',
    }),
    children: r.many.organizations({
      from: r.organizations.id,
      to: r.organizations.parent_id,
      alias: 'organizations__parent',
    }),
  },

  personal_access_tokens: {
    // tokenable_type='App\Models\User' bo'lganda user'ga bog'liq.
    user: r.one.users({
      from: r.personal_access_tokens.tokenable_id,
      to: r.users.id,
    }),
  },

  user_telegrams: {
    user: r.one.users({
      from: r.user_telegrams.user_id,
      to: r.users.id,
    }),
  },

  // Spatie permissions
  roles: {
    permissions: r.many.permissions({
      from: r.roles.id.through(r.role_has_permissions.role_id),
      to: r.permissions.id.through(r.role_has_permissions.permission_id),
    }),
    users: r.many.users({
      from: r.roles.id.through(r.model_has_roles.role_id),
      to: r.users.id.through(r.model_has_roles.model_id),
    }),
  },

  permissions: {
    roles: r.many.roles({
      from: r.permissions.id.through(r.role_has_permissions.permission_id),
      to: r.roles.id.through(r.role_has_permissions.role_id),
    }),
  },

  // OAuth
  oauth_clients: {
    oauth_client_codes: r.many.oauth_client_codes({
      from: r.oauth_clients.id,
      to: r.oauth_client_codes.oauth_client_id,
    }),
  },

  oauth_client_codes: {
    oauth_client: r.one.oauth_clients({
      from: r.oauth_client_codes.oauth_client_id,
      to: r.oauth_clients.id,
    }),
    user: r.one.users({
      from: r.oauth_client_codes.user_id,
      to: r.users.id,
    }),
  },

  // Structure: countries → regions → cities ierarxiyasi.
  countries: {
    regions: r.many.regions({
      from: r.countries.id,
      to: r.regions.country_id,
    }),
  },

  regions: {
    country: r.one.countries({
      from: r.regions.country_id,
      to: r.countries.id,
    }),
    cities: r.many.cities({
      from: r.regions.id,
      to: r.cities.region_id,
    }),
  },

  cities: {
    region: r.one.regions({
      from: r.cities.region_id,
      to: r.regions.id,
    }),
  },

  // Universities + city.region eager load uchun.
  universities: {
    city: r.one.cities({
      from: r.universities.city_id,
      to: r.cities.id,
    }),
  },

  // Schedule.work_days (hasMany) — eager load uchun.
  schedules: {
    work_days: r.many.work_days({
      from: r.schedules.id,
      to: r.work_days.schedule_id,
    }),
  },

  // WorkDay.schedule (belongsTo) — eager load uchun.
  work_days: {
    schedule: r.one.schedules({
      from: r.work_days.schedule_id,
      to: r.schedules.id,
    }),
  },
}));
