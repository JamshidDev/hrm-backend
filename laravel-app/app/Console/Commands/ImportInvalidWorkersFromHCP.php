<?php

namespace App\Console\Commands;

use App\Services\HikCentralService;
use Illuminate\Console\Command;

class ImportInvalidWorkersFromHCP extends Command
{
    protected $signature = 'hcp:sync-invalid-workers';
    protected $description = 'Update invalids from HCP every 5 minutes';

    public function handle(): void
    {
        new HikCentralService()->getHikCentralInvalidWorkers();
    }
}
