<?php

namespace Modules\HR\Http\Requests\OrganizationIncentive;

use Illuminate\Foundation\Http\FormRequest;

class OrganizationIncentiveIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string'],
            'download' => ['nullable']
        ];
    }
}
