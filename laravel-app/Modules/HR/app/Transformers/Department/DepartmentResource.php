<?php

namespace Modules\HR\Transformers\Department;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\DepartmentLevelEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => [
                'id' => $this->level,
                'name' => DepartmentLevelEnum::get($this->level) ?? ''
            ],
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'comment' => $this->comment,
            'organization' => new OrganizationListResource($this->organization)
        ];
    }
}
