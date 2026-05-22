<?php

namespace Modules\Integration\Http\Requests\Integration;

use Illuminate\Foundation\Http\FormRequest;

class IntegrationDashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organizations' => ['nullable', 'string'],
            'departments' => ['nullable', 'string'],
            'date' => ['date', 'required']
        ];
    }
}
