<?php

namespace Modules\HR\Transformers\Department;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class DepartmentOrganizationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'    => $this->id,
            'name'  => $this->name,
            'organization' => new OrganizationListResource($this->organization),
        ];
    }
}
