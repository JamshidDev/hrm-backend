<?php

namespace Modules\Economist\Transformers\StaffingApprove;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ApproveIndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'date' => $this->date,
            'organization' => new OrganizationListResource($this->organization),
            'generate' => $this->generate,
            'confirmatory' => new WorkerPositionMinimalResource($this->confirmatory),
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label(),
            ]
        ];
    }
}
