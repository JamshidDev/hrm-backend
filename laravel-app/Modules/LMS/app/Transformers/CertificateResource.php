<?php

namespace Modules\LMS\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\LMS\Enums\SerialTypeEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class CertificateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $wp = $this->worker_position;
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker' => new WorkerMinimalResource($this->worker),
            'organization' => new OrganizationListResource($wp->organization),
            'department' => new DepartmentListResource($wp->department),
            'position' => new PositionMinimalResource($wp->position),
            'edu_plan' => new EduPlanMinimalResource($wp->edu_plan),
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
