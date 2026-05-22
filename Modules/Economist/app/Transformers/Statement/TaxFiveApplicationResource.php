<?php

namespace Modules\Economist\Transformers\Statement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TaxFiveApplicationResource extends JsonResource
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
            'full_name' => $this->full_name,
            'total_income' => number_format($this->total_income, 2, '.', ' '),
            'reported_income' => number_format($this->reported_income, 2, '.', ' '),
            'income_type' => [
                'id' => $this->income_type,
                'name' => $this->incomeType((int)$this->income_type)
            ],
            'total_tax' => number_format($this->total_tax, 2, '.', ' '),
            'reported_tax' => number_format($this->reported_tax, 2, '.', ' ')
        ];
    }

    public function incomeType($status): string
    {
        return match ($status) {
            1 => trans('messages.tax_five.income_type.one'),
            2 => trans('messages.tax_five.income_type.two'),
            3 => trans('messages.tax_five.income_type.three'),
            default => trans('messages.tax_five.income_type.four'),
        };
    }


}
