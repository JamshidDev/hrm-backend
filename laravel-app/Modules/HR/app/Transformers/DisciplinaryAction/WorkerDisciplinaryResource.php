<?php

namespace Modules\HR\Transformers\DisciplinaryAction;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerDisciplinaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'date' => $this->date,
            'fine' => $this->fine,
            'fine_type' => $this->fine_type,
            'reason' => $this->reason,
            'number' => $this->number
        ];
    }
}
