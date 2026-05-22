<?php

namespace Modules\Integration\Http\Requests\Integration;

use Illuminate\Foundation\Http\FormRequest;

class IntegrationWorkersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'departments' => 'nullable|string|regex:/^\d+(,\d+)*$/',
            'positions' => 'nullable|string|regex:/^\d+(,\d+)*$/',
            'department_position_id' => 'nullable|integer',
            'ids' => 'nullable|string|regex:/^\d+(,\d+)*$/',
            'pin' => 'nullable|string|size:14',
            'search' => 'nullable|string|max:255',
            'order' => 'nullable|string|max:255',
            'direction' => 'nullable|string|in:asc,desc',
            'per_page' => 'nullable|integer|min:1|max:1000',
        ];
    }
}
