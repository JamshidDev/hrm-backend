<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\PartyEnum;

class WorkerPartyResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'party' => [
                'id' => $this->party,
                'name' => PartyEnum::get($this->party)
            ],
            'from_date' => $this->from_date,
            'to_date' => $this->to_date
        ];
    }
}
