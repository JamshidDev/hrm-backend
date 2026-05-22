<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkDurationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tMin = $this->total_minutes;

        if ($this->event_type && now()->format('Y-m-d') === Carbon::parse($this->event_time)->format('Y-m-d')) {
            $tMin += (int)abs(Carbon::parse($this->event_time)->diffInMinutes(now()));
        }

        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'worker_position' => PositionHelper::getShortPosition($this->worker_position),
            'building' => new BuildingMinResource($this->building),
            'access_level' => new AccessLevelMinResource($this->access_level),
            'organization' => new OrganizationListResource($this->worker_position?->organization),
            'year' => $this->year,
            'month' => $this->month,
            'day' => $this->day,
            'total_minutes' => $tMin,
            'event_time' => $this->event_time,
            'event_type' => $this->event_type,
            'status' => 'in-work'
        ];
    }
}
