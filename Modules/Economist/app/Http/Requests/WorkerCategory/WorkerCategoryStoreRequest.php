<?php

namespace Modules\Economist\Http\Requests\WorkerCategory;

use Illuminate\Foundation\Http\FormRequest;

class WorkerCategoryStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'external_worker_count' => ['nullable', 'numeric'],
            'external_salary_fund' => ['nullable', 'numeric'],
            'capital_society_worker_count' => ['nullable', 'numeric'],
            'capital_society_salary_fund' => ['nullable', 'numeric'],
            'capital_own_use_worker_count' => ['nullable', 'numeric'],
            'capital_own_use_salary_fund' => ['nullable', 'numeric'],
            'capital_foreign_company_worker_count' => ['nullable', 'numeric'],
            'capital_foreign_company_salary_fund' => ['nullable', 'numeric'],
            'construction_society_worker_count' => ['nullable', 'numeric'],
            'construction_society_salary_fund' => ['nullable', 'numeric'],
            'construction_own_use_worker_count' => ['nullable', 'numeric'],
            'construction_own_use_salary_fund' => ['nullable', 'numeric'],
            'construction_foreign_company_worker_count' => ['nullable', 'numeric'],
            'construction_foreign_company_salary_fund' => ['nullable', 'numeric'],
            'other_society_worker_count' => ['nullable', 'numeric'],
            'other_society_salary_fund' => ['nullable', 'numeric'],
            'other_own_use_worker_count' => ['nullable', 'numeric'],
            'other_own_use_salary_fund' => ['nullable', 'numeric'],
            'other_foreign_company_worker_count' => ['nullable', 'numeric'],
            'other_foreign_company_salary_fund' => ['nullable', 'numeric'],
            'temporary_contract_worker_count' => ['nullable', 'numeric'],
            'temporary_contract_salary_fund' => ['nullable', 'numeric'],
            'civil_contract_worker_count' => ['nullable', 'numeric'],
            'civil_contract_salary_fund' => ['nullable', 'numeric'],
            'freelancer_worker_count' => ['nullable', 'numeric'],
            'freelancer_salary_fund' => ['nullable', 'numeric'],
        ];
    }
}
