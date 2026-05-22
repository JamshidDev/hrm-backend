<?php

namespace Modules\Med\Transformers;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class SendedWorkerResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker_position_id' => $this->worker_position_id,
            'worker' => new WorkerInfoResource($this->worker),
            'polyclinic' => new OrganizationListResource($this->polyclinic),
            'position' => PositionHelper::getShortPosition($this->worker_position),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'commission_leader_id' => $this->commission_leader_id,
            'status' => [
                'id' => $this->status,
                'name' => MedStatusEnum::get($this->status)
            ],
            'start_date' => $this->start_date,
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::get($this->confirmation)
            ],
            'generate' => $this->generate
        ];
    }
}
