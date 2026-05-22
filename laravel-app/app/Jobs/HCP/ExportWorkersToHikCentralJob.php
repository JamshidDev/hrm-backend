<?php

namespace App\Jobs\HCP;

use App\Helpers\TurnStileHelper;
use App\Http\Middleware\PreventDuplicateImport;
use App\Services\HikCentralService;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\ExportWorkerError;
use Modules\Turnstile\Models\ExportWorkerToHikCentralJob;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use Throwable;

class ExportWorkersToHikCentralJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected int $organization_id;

    protected string|null $departments;
    protected int|null $access_level_id;
    protected array|null $workerPositionIds;
    protected string $department;

    protected bool $status;

    protected string $errors = '';

    protected array|null $workerIds;

    protected ExportWorkerToHikCentralJob $export;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('export_workers_to_hik_central_job_lock')];
    }

    public function __construct(
        $export,
        $organization_id,
        $access_level_id,
        $departments,
        $workerPositionIds,
        $status,
        $department,
        $workerIds = null
    ) {
        $this->export = $export;
        $this->organization_id = $organization_id;
        $this->access_level_id = $access_level_id;
        $this->departments = $departments;
        $this->workerPositionIds = $workerPositionIds;
        $this->status = $status;
        $this->department = $department ?? "1";
        $this->workerIds = $workerIds;
    }

    public function handle(): void
    {
        try {
            if ($this->workerIds) {
                $workers = WorkerPosition::query()->whereIn('worker_id', $this->workerIds);
            } else {
                $workers = WorkerPosition::query()
                    ->when($this->organization_id, function ($query, $organization_id) {
                        return $query->where('organization_id', $organization_id);
                    });
            }

            $workers = $workers->when($this->departments, function ($query, $departments) {
                    return $query->whereIn('department_id', explode(',', $departments));
                })
                ->when($this->workerPositionIds, function ($query, $workerPositionIds) {
                    return $query->whereIn('id', $workerPositionIds);
                })
                ->where('status', PositionStatusEnum::ACTIVE->value)
                ->with('worker.photos')
                ->get();

            $this->export->workers_count = $workers->count();
            $this->export->save();
            $exported_count = 0;

            $accessLevelId = HikCentralAccessLevel::query()
                ->find($this->access_level_id)
                ?->hik_central_access_level_id;
            $endTime = now()->addYear(2)->format('Y-m-d H:i:s');
            $personIds = [];
            foreach ($workers as $worker) {
                try {
                    $worker = $worker->worker;
                    $lastPhoto = $worker->photos->last();
                    if (!$lastPhoto) {
                        continue;
                    }
                    $convertPhoto = new TurnStileHelper()
                        ->convertImage(
                            $worker,
                            null,
                            $lastPhoto->id,
                            $lastPhoto
                        );

                    $res = new HikCentralService()
                        ->addWorkerToServer(
                            $worker,
                            $convertPhoto['base64'],
                            $endTime,
                            $this->department,
                        );

                    if (!$res['status']) {
                        ExportWorkerError::query()
                            ->create([
                                'export_worker_to_hik_central_job_id' => $this->export->id,
                                'worker_id' => $worker->id,
                                'comment' => $res['msg'] ?? null,
                            ]);
                        continue;
                    }
                    $newPersonId = $res['personId'];
                    $newPerson = WorkerHikCentral::query()
                        ->updateOrCreate(
                            [
                                'worker_id' => $worker->id,
                                'hik_central_key' => 1,
                                'hik_central_person_id' => $newPersonId,
                            ],
                            [
                                'worker_photo_id' => $convertPhoto['photo_id']
                            ]
                        );

                    $personIds[] = (string)$newPerson->hik_central_person_id;
                    WorkerAccessLevel::query()
                        ->updateOrCreate(
                            [
                                'worker_id' => $worker->id,
                                'hik_central_access_level_id' => $this->access_level_id,
                            ],
                            [
                                'worker_hik_central_id' => $newPerson->id,
                                'worker_photo_id' => $convertPhoto['photo_id'],
                                'hik_central_key' => 1,
                                'hik_central_person_id' => $newPerson->hik_central_person_id,
                                'to' => $endTime,
                            ]
                        );
                    $exported_count++;

                } catch (Exception $e) {
                    ExportWorkerError::query()
                        ->create([
                            'export_worker_to_hik_central_job_id' => $this->export->id,
                            'worker_id' => $worker->id,
                            'comment' => $e->getMessage()
                        ]);
                }
            }

            new HikCentralService()->attachWorkerToAccessLevel($personIds, $accessLevelId);

            $this->export->exported_count = $exported_count;
            $this->export->errors = $this->errors;
            $this->export->status = 3;
            $this->export->save();
        } catch (Throwable $e) {
            $this->export->status = 2;
            $this->export->save();
        } finally {
            Cache::lock('export_workers_to_hik_central_job_lock')->release();
        }
    }

}
