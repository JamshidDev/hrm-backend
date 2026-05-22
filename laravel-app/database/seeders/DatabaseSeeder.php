<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\HR\Database\Seeders\HRDatabaseSeeder;
use Modules\Structure\Database\Seeders\StructureDatabaseSeeder;
use Modules\Structure\Database\Seeders\WorkDayDatabaseSeeder;
use Modules\Turnstile\Database\Seeders\TurnstileDatabaseSeeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleAndPermissionsSeeder::class);
        $this->call(StructureDatabaseSeeder::class);
        $this->call(HRDatabaseSeeder::class);
        $this->call(QuoteSeeder::class);
        $this->call(WorkDayDatabaseSeeder::class);
        $this->call(TurnstileDatabaseSeeder::class);
    }
}
