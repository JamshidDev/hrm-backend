<?php

namespace Modules\Confirmation\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;
use Modules\LMS\Enums\SerialTypeEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class LmsCertificateResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker_position' => new WorkerPositionMinResource($this->worker_position),
            'organization' => new OrganizationListResource($this->organization),
            'cert_from' => $this->cert_from,
            'cert_to' => $this->cert_to,
            'serial' => SerialTypeEnum::get($this->serial),
            'number' => Helper::pad_number($this->number),
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
