<?php

namespace Modules\HR\Transformers\WorkerApplication;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\HR\Transformers\Worker\WorkerResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerApplicationMinimalResource extends JsonResource
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
            'number' => $this->number,
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::get($this->confirmation)
            ]
        ];
    }
}
