<?php

namespace Modules\HR\Transformers\Incentives;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerIncentiveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'organization'    => new OrganizationListResource($this->organization),
            'date'            => $this->date,
            'by_whom'         => $this->by_whom,
            'gift'            => $this->gift,
            'gift_type'       => $this->gift_type,
            'reason'          => $this->reason,
            'number'          => $this->number
        ];
    }
}
