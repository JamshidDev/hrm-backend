<?php

namespace Modules\Economist\Transformers\Statement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class PensionPaymentApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'worker' => new WorkerMinimalResource($this->worker),
            'year' => $this->year,
            'month' => $this->month,
            'pin' => $this->pin,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'income_tax_paid' => $this->income_tax_paid,
            'mandatory_pension_contribution' => $this->mandatory_pension_contribution,
            'voluntary_pension_contribution' => $this->voluntary_pension_contribution,
            'total_contributions' => $this->total_contributions
        ];
    }


}
