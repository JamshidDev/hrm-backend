<?php

namespace Modules\Integration\Http\Requests\Integration;

use Illuminate\Foundation\Http\FormRequest;

class IntegrationPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'max:1000'],
            'search' => ['nullable', 'string'],
            'organization_id' => ['nullable', 'integer'],
            'department_id' => ['nullable', 'integer'],
            'ids' => ['nullable', 'string']
        ];
    }
}
