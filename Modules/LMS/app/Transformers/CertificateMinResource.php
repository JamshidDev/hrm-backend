<?php

namespace Modules\LMS\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

class CertificateMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cert_from' => $this->cert_from,
            'cert_to' => $this->cert_to,
            'serial' => $this->serial,
            'number' => $this->number,
            'start_exam_result' => $this->start_exam_result,
            'end_exam_result' => $this->end_exam_result,
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'generate' => $this->generate,
            'confirmation'      => [
                'id'   => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label(),
            ]
        ];
    }
}
