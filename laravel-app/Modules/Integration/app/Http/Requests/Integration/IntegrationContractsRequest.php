<?php

namespace Modules\Integration\Http\Requests\Integration;

use Illuminate\Foundation\Http\FormRequest;

class IntegrationContractsRequest extends FormRequest
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
            'organizations' => ['nullable', 'string'],
            'departments' => ['nullable', 'string'],
            'status' => ['nullable', 'integer']
        ];
    }
}
