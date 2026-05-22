<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class SearchWorkersWithScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'position' => $this->position?->name,
            'scheduleGroup' => new ScheduleGroupMinResource($this->scheduleGroup),
            'scheduleType' => new ScheduleTypeMinResource($this->schedyleType)
        ];
    }
}
