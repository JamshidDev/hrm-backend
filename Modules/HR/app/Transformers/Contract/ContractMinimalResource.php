<?php

namespace Modules\HR\Transformers\Contract;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;

class ContractMinimalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'table_number'     => $this->table_number,
            'contract_date'    => $this->contract_date,
            'contract_to_date' => $this->contract_to_date,
            'number'           => $this->number,
            'type'             => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::tryFrom($this->type)?->label()
            ]
        ];
    }
}
