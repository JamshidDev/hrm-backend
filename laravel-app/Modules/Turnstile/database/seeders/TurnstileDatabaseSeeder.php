<?php

namespace Modules\Turnstile\Database\Seeders;

use Illuminate\Database\Seeder;

class TurnstileDatabaseSeeder extends Seeder
{
    public function run(): void
    {
         $this->call([TerminalSeeder::class]);
    }
}
