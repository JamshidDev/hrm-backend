<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\ContractAdditional\ContractAdditionalResource;

class ContractAdditionalConfirmationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'contract_additional' => new ContractAdditionalResource($this->contract_additional),
            'status'              => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ],
            'position'            => $this->position,
            'confirmation_type'   => [
                'id'   => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::get($this->confirmation_type)
            ],
            "main"                => $this->main,
            'generate'            => $this->contract_additional->generate
        ];
    }
}
