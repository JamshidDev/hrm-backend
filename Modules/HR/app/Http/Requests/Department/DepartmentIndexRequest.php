<?php

namespace Modules\HR\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class DepartmentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string']
        ];
    }
}
