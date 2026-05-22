<?php

namespace Modules\Structure\Transformers\DocumentExample;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class CommandTypeResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => [
                'id' => $this->type,
                'name' => ContractTypeEnum::get($this->type)
            ],
            'organization' => new OrganizationListResource($this->organization)
        ];
    }
}
