<?php

namespace Modules\Economist\Http\Requests\WorkerCategory;

use Illuminate\Foundation\Http\FormRequest;

class WorkerCategoryUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['sometimes', 'integer', 'min:2010', 'max:2030'],
            'month' => ['sometimes', 'integer', 'min:1', 'max:12'],
            'external_worker_count' => ['sometimes', 'numeric'],
            'external_salary_fund' => ['sometimes', 'numeric'],
            'capital_society_worker_count' => ['sometimes', 'numeric'],
            'capital_society_salary_fund' => ['sometimes', 'numeric'],
            'capital_own_use_worker_count' => ['sometimes', 'numeric'],
            'capital_own_use_salary_fund' => ['sometimes', 'numeric'],
            'capital_foreign_company_worker_count' => ['sometimes', 'numeric'],
            'capital_foreign_company_salary_fund' => ['sometimes', 'numeric'],
            'construction_society_worker_count' => ['sometimes', 'numeric'],
            'construction_society_salary_fund' => ['sometimes', 'numeric'],
            'construction_own_use_worker_count' => ['sometimes', 'numeric'],
            'construction_own_use_salary_fund' => ['sometimes', 'numeric'],
            'construction_foreign_company_worker_count' => ['sometimes', 'numeric'],
            'construction_foreign_company_salary_fund' => ['sometimes', 'numeric'],
            'other_society_worker_count' => ['sometimes', 'numeric'],
            'other_society_salary_fund' => ['sometimes', 'numeric'],
            'other_own_use_worker_count' => ['sometimes', 'numeric'],
            'other_own_use_salary_fund' => ['sometimes', 'numeric'],
            'other_foreign_company_worker_count' => ['sometimes', 'numeric'],
            'other_foreign_company_salary_fund' => ['sometimes', 'numeric'],
            'temporary_contract_worker_count' => ['sometimes', 'numeric'],
            'temporary_contract_salary_fund' => ['sometimes', 'numeric'],
            'civil_contract_worker_count' => ['sometimes', 'numeric'],
            'civil_contract_salary_fund' => ['sometimes', 'numeric'],
            'freelancer_worker_count' => ['sometimes', 'numeric'],
            'freelancer_salary_fund' => ['sometimes', 'numeric'],
        ];
    }
}
