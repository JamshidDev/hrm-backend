<?php

namespace Modules\Structure\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ReportMonthPerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'month' => $this->month,
            'organization' => new OrganizationListResource($this->whenLoaded('organization'))
        ];
    }
}
