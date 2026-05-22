<?php

namespace Modules\HR\Transformers\Vacation;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;

class VacationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $to = Carbon::parse($this->to);
        $today = Carbon::today();

        $diff = $to->diff($today);
        $days = $to->diffInDays($today);

        return [
            'id'         => $this->id,
            'worker_position'     => new WorkerPositionMinimalResource($this->worker_position),
            'type'       => [
                'id'   => $this->type,
                'name' => VacationTypeEnum::get($this->type, app()->getLocale()),
            ],
            'from'       => $this->from,
            'to'         => $this->to,
            'work_day'   => $this->work_day,
            'rest_day'   => $this->rest_day,
//            'all_day'    => $this->all_day,
            'main_day'   => $this->main_day,
            'second_day' => $this->second_day,
            'all_day'         => $diff->invert === 1 ? abs($days) : -abs($days),
        ];
    }
}
