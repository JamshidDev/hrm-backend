<?php

namespace Modules\HR\Transformers\WorkerApplication;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created_at' => $this->created_at,
            'type' => [
                'id' => $this->type,
                'name' => WorkerApplicationTypeEnum::get($this->type)
            ],
            'worker' => new WorkerMinimalResource($this->worker),
            'number' => $this->number,
            'file' => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'organization' => new OrganizationListResource($this->organization),
            'status' => $this->status,
            'generate' => $this->generate,
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::get($this->confirmation)
            ],
            'creator' => $this->user_id,
        ];
    }
}
