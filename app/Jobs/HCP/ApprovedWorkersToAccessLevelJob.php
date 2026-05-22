<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Helpers\TurnStileHelper;
use App\Services\HikCentralService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Modules\Turnstile\Models\TurnstileWorkerApprove;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use Throwable;

class ApprovedWorkersToAccessLevelJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;
    protected TurnstileWorkerApprove $approve;

    public function __construct($approve)
    {
        $this->approve = $approve;
    }

    public function handle(): void
    {
        try {
            $workerPositions = $this->approve->load([
                'worker_positions.worker.photos',
                'access_levels'
            ])->worker_positions;
            $endTime = now()->addYear(2)->format('Y-m-d H:i:s');
            $personIds = [];

            foreach ($workerPositions as $workerPosition) {
                $worker = $workerPosition->worker;
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
                    );

                if (!$res['status']) {
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

                foreach ($this->approve->access_levels as $access_level) {
                    WorkerAccessLevel::query()
                        ->updateOrCreate(
                            [
                                'worker_id' => $worker->id,
                                'hik_central_access_level_id' => $access_level->id,
                            ],
                            [
                                'worker_hik_central_id' => $newPerson->id,
                                'worker_photo_id' => $convertPhoto['photo_id'],
                                'hik_central_key' => 1,
                                'hik_central_person_id' => $newPerson->hik_central_person_id,
                                'to' => $endTime,
                            ]
                        );
                }

                $personIds[] = (string)$newPerson->hik_central_person_id;
            }

            foreach ($this->approve->access_levels as $access_level) {
                new HikCentralService()->attachWorkerToAccessLevel($personIds, $access_level->hik_central_access_level_id);
            }

        } catch (Throwable $e) {
            Helper::setLog($e, 'Attach worker to AL HCP');
        }
    }

}
