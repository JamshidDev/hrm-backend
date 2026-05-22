<?php

namespace Modules\HR\Transformers\ConfirmationWorker;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ConfirmationWorkerLevelEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ConfirmationWorkerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'level'    => [
                'id'   => $this->level,
                'name' => ConfirmationWorkerLevelEnum::get($this->level ?? 1)
            ],
            'position' => $this->position,
        ];
    }
}
