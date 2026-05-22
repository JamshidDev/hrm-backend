<?php

namespace Modules\HR\Http\Requests\DepartmentLocation;

use Illuminate\Foundation\Http\FormRequest;

class DepartmentLocationIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['nullable', 'integer'],
            'organization_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
