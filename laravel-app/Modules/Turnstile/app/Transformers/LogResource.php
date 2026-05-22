<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class LogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'worker_position' => PositionHelper::getShortPosition($this->worker_position),
            'terminal' => new TerminalListResource($this->terminal),
            'organization' => new OrganizationListResource($this->worker_position?->organization),
            'event_time' => $this->event_time,
            'event_type' => $this->event_type
        ];
    }
}
