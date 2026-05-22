<?php

namespace Modules\HR\Transformers\Contract;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;

class ContractMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'number'           => $this->number,
            'contract_date'    => $this->contract_date,
            'contract_to_date' => $this->contract_to_date,
            'type'             => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::tryFrom($this->type)?->label()
            ]
        ];
    }
}
