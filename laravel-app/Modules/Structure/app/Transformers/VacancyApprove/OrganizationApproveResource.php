<?php

namespace Modules\Structure\Transformers\VacancyApprove;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class OrganizationApproveResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from' => new OrganizationListResource($this->from_organization),
            'to' => new OrganizationListResource($this->to_organization),
        ];
    }
}
