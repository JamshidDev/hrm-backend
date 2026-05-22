<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;

class ChangePushRabbitService
{
    public function __construct(protected RabbitService $rabbit) {}

    public function workerPositionUpdate($workerPosition): void
    {
        if ($workerPosition) {

            $worker = $workerPosition->load([
                'worker.phones',
                'worker.country',
                'worker.region',
                'worker.city'
            ])->worker;

            $data = [
                'id' => $workerPosition->id,
                'organization_id' => $workerPosition->organization_id,
                'department_id' => $workerPosition->department_id,
                'department_position_id' => $workerPosition->department_position_id,
                'organization_name' => $workerPosition->organization?->name,
                'department_name' => $workerPosition->department?->name,
                'position_name' => $workerPosition->position?->name,
                'post_name' => PositionHelper::getFullPosition($workerPosition),
                'position_date' => $workerPosition->position_date,
                'status' => $workerPosition->status,
                'to' => $workerPosition->to,
                'created_at' => $workerPosition->created_at,
                'updated_at' => $workerPosition->updated_at,
                'deleted_at' => $workerPosition->deleted_at,
                'last_name' => $worker->last_name,
                'first_name' => $worker->first_name,
                'middle_name' => $worker->middle_name,
                'photo' => Helper::fileUrl($worker->photo),
                'birthday' => $worker->birthday,
                'card' => $worker->card,
                'pin' => $worker->pin,
                'gender' => $worker->sex ? 'male' : 'female',
                'worker_id' => $worker->id,
                'phone' => $worker->phones?->first()?->phone,
                'organization_group' => $workerPosition->organization?->group,
                'department_level' => $workerPosition->department?->level,
                'position_id' => $workerPosition->position_id,
                'country_id' => $worker->country_id,
                'country_name' => $worker->country?->name,
                'city_id' => $worker->city_id,
                'city_name' => $worker->city?->name,
            ];
            $this->rabbit->publishWorkerEvent($data, 'worker.position.update');
        }
    }

}
