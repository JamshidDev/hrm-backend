<?php

namespace Modules\Turnstile\Transformers\Preview;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;

class VacationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'worker_position'     => new WorkerPositionMinimalResource($this->worker_position),
            'type'       => [
                'id'   => $this->type,
                'name' => VacationTypeEnum::get($this->type, app()->getLocale()),
            ],
            'from'       => $this->from,
            'to'         => $this->to,
            'all_day'    => $this->all_day
        ];
    }
}
