<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\MilitaryStatusEnum;
use Modules\HR\Enums\PartyEnum;

class WorkerMilitaryServiceResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'number' => $this->number,
            'speciality' => $this->speciality,
            'status' => [
                'id' => $this->id,
                'name' => MilitaryStatusEnum::get($this->status)
            ],
            'commissariat' => $this->commissariat
        ];
    }
}
