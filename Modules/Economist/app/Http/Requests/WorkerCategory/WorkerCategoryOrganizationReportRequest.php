<?php

namespace Modules\Economist\Http\Requests\WorkerCategory;

use Illuminate\Foundation\Http\FormRequest;

class WorkerCategoryOrganizationReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['nullable', 'integer', 'min:2010', 'max:2030'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ];
    }
}
