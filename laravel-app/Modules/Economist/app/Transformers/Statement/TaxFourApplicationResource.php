<?php

namespace Modules\Economist\Transformers\Statement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TaxFourApplicationResource extends JsonResource
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
            'position' => $this->position,
            'employee_status' => [
                'id' => $this->employee_status,
                'name' => $this->employeeStatus($this->employee_status ?? 1)
            ],
            'contract_type' => [
                'id' => $this->contract_type,
                'name' => $this->contractType((int)$this->contract_type)
            ],
            'total_salary_income' => number_format($this->total_salary_income, 2, '.', ' '),
            'reported_salary_income' => number_format($this->reported_salary_income, 2, '.', ' '),
            'total_tax' => number_format($this->total_tax, 2, '.', ' '),
            'reported_tax' => number_format($this->reported_tax, 2, '.', ' ')
        ];
    }

    public function employeeStatus($status)
    {
        $status = (int)$status;
        return match ($status) {
            1 => trans('messages.tax_four.employee_status.one'),
            2 => trans('messages.tax_four.employee_status.two'),
            default => ' ',
        };
    }

    public function contractType($type)
    {
        return match ($type) {
            1 => trans('messages.tax_four.contract_type.one'),
            2 => trans('messages.tax_four.contract_type.two'),
            3 => trans('messages.tax_four.contract_type.three'),
            4 => trans('messages.tax_four.contract_type.four'),
            default => ' ',
        };
    }

}
