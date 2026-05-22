<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Http\Middleware\PreventDuplicateImport;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Modules\Turnstile\Http\Controllers\HikCentralWorkerController;
use Modules\Turnstile\Models\WorkerHikCentral;
use Throwable;

class AttachWorkersToAccessLevelHCPJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;
    protected string $newPersonId;
    protected Collection $accessLevels;
    protected WorkerHikCentral $newPerson;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('attach_workers_to_access_level_hcp_job_lock')];
    }

    public function __construct($accessLevels, $newPersonId, $newPerson)
    {
        $this->newPersonId = $newPersonId;
        $this->accessLevels = $accessLevels;
        $this->newPerson = $newPerson;
    }

    public function handle(): void
    {
        try {
            new HikCentralWorkerController()
                ->attachWorkersToAccessLevels($this->accessLevels, $this->newPersonId, $this->newPerson, 'detach', true);
        } catch (Throwable $e) {
            Helper::setLog($e, 'Attach worker to AL HCP');
            Cache::lock('update_worker_in_hcp_job_lock')->release();
        } finally {
            Cache::lock('update_worker_in_hcp_job_lock')->release();
        }
    }

}
