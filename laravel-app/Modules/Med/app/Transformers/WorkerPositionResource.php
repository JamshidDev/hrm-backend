<?php

namespace Modules\Med\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\EducationEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'last_name' => $this->worker->last_name,
            'first_name' => $this->worker->first_name,
            'middle_name' => $this->worker->middle_name,
            'birthday' => $this->worker->birthday,
            'organization' => new OrganizationListResource($this->organization),
            'photo' => Helper::fileUrl($this->worker->photo),
            'education' => EducationEnum::get($this->worker->education),
            'position' => $this->position?->name,
            'department' => $this->department?->name,
            'position_date' => $this->position_date,
            'contract_type' => ContractTypeEnum::tryFrom($this->type)?->labelMinimized()
        ];
    }
}
