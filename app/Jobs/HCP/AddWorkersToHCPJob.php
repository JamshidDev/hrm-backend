<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Models\User;
use App\Services\HikCentralService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\HikCentralDepartment;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use RuntimeException;
use Throwable;

class AddWorkersToHCPJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected Worker $worker;
    protected Collection $accessLevels;
    protected array $convertPhoto;
    protected string $to;
    protected User $user;

    public function __construct($worker, $accessLevels, $convertPhoto, $to, $user)
    {
        $this->worker = $worker;
        $this->accessLevels = $accessLevels;
        $this->convertPhoto = $convertPhoto;
        $this->to = $to;
        $this->user = $user;
    }

    public function handle(): void
    {
        try {
            $newPerson = WorkerHikCentral::query()->where('worker_id', $this->worker->id)->first();
            if (!$newPerson) {
                $department = HikCentralDepartment::query()
                    ->find($this->accessLevels->first()->hik_central_department_id);
                $res = new HikCentralService()
                    ->addWorkerToServer(
                        $this->worker,
                        $this->convertPhoto['base64'],
                        $this->to,
                        (string)$department?->hik_central_department_id
                    );

                if (!$res['status']) {
                    throw new RuntimeException($res['msg'] ?? 'Error');
                }
                $newPersonId = $res['personId'];
                $newPerson = WorkerHikCentral::query()
                    ->updateOrCreate([
                        'worker_id' => $this->worker->id,
                        'hik_central_key' => 1,
                        'hik_central_person_id' => $newPersonId,
                    ], [
                        'worker_photo_id' => $this->convertPhoto['photo_id'] ?? null,
                    ]);
            } else {
                $newPersonId = (string)$newPerson->hik_central_person_id;
                if ($newPerson->worker_photo_id !== $this->convertPhoto['photo_id']) {
                    $res = new HikCentralService()->updatePersonFace($newPersonId,  $this->convertPhoto['base64']);
                    if ((int)$res->code === 0) {
                        $newPerson->update(['worker_photo_id' => $this->convertPhoto['photo_id'] ?? null]);
                    } else {
                        throw new RuntimeException($res->msg ?? 'Error');
                    }
                }
            }

            foreach ($this->accessLevels as $accessLevel) {
                $res = new HikCentralService()->attachWorkerToAccessLevel([$newPersonId], $accessLevel?->hik_central_access_level_id);

                if (!$res['status']) {
                    continue;
                }

                WorkerAccessLevel::query()->updateOrCreate(
                    [
                        'worker_id' => $newPerson->worker_id,
                        'hik_central_access_level_id' => $accessLevel->id,
                    ],
                    [
                        'worker_hik_central_id' => $newPerson->id,
                        'worker_photo_id' => $this->convertPhoto['photo_id'],
                        'hik_central_key' => 1,
                        'hik_central_person_id' => $newPersonId,
                        'to' => $this->to,
                    ]
                );
            }

        } catch (Throwable $e) {
            Helper::setLog($e, 'Add worker to HCP');
        }
    }

}
