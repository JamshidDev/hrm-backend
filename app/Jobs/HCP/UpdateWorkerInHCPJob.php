<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Http\Middleware\PreventDuplicateImport;
use App\Services\HikCentralService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Modules\HR\Models\Worker;
use Throwable;

class UpdateWorkerInHCPJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected Worker $worker;
    protected array $convertPhoto;
    protected string $to;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('update_worker_in_hcp_job_lock')];
    }

    public function __construct($worker)
    {
        $this->worker = $worker;
    }

    public function handle(): void
    {
        try {
            $res = new HikCentralService()
                ->addWorkerToServer(
                    $this->worker,
                    $this->convertPhoto['base64'],
                    $this->to,
//                    (string)$hcpDepartmentId
                );

            if (!$res['status']) {
                return;
            }

        } catch (Throwable $e) {
            Helper::setLog($e, 'Add worker to HCP');
            Cache::lock('update_worker_in_hcp_job_lock')->release();
        } finally {
            Cache::lock('update_worker_in_hcp_job_lock')->release();
        }
    }

}
