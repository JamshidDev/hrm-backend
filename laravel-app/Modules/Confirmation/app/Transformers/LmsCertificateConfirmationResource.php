<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;

class LmsCertificateConfirmationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'certificate' => new LmsCertificateResource($this->certificate),
            'status' => [
                'id' => $this->status,
                'name' => ConfirmationStatusEnum::tryFrom($this->status)?->label()
            ],
            'position' => $this->position,
            'confirmation_type' => [
                'id' => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::tryFrom($this->confirmation_type)?->label()
            ],
            "main" => $this->main,
            'generate' => $this->certificate->generate
        ];
    }
}
