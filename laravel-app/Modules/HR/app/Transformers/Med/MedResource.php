<?php

namespace Modules\HR\Transformers\Med;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class MedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $to = Carbon::parse($this->to);
        $today = Carbon::today();

        $diff = $to->diff($today);
        $days = $to->diffInDays($today);

        $vacation = $this->worker->currentVacation?->to;

        return [
            'id'           => $this->id,
            'worker'       => new WorkerMinimalResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'position' => PositionHelper::getShortPosition($this->worker_position),
            'status'       => [
                'id'   => $this->status,
                'name' => MedStatusEnum::get($this->status)
            ],
            'from'         => $this->from,
            'to'           => $this->to,
            'days'         => $diff->invert === 1 ? abs($days) : -abs($days),
            'file'         => Helper::fileUrl($this->file),
            'comment'      => $this->comment,
            'current' => $this->current,
            'vacation' => $vacation,
        ];
    }
}
