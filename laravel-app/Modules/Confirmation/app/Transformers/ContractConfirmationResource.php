<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\Contract\ContractResource;

class ContractConfirmationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'contract'          => new ContractResource($this->contract),
            'status'            => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ],
            'position'          => $this->position,
            'confirmation_type' => [
                'id'   => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::get($this->confirmation_type)
            ],
            "main"              => $this->main,
            'generate'          => $this->contract->generate
        ];
    }
}
