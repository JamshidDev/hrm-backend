<?php

namespace Modules\HR\Http\Requests\DepartmentPosition;

use Illuminate\Foundation\Http\FormRequest;

class DepartmentPositionIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'string'],
            'search' => ['nullable', 'string']
        ];
    }
}
