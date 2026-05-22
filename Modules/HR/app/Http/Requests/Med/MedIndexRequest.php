<?php

namespace Modules\HR\Http\Requests\Med;

use Illuminate\Foundation\Http\FormRequest;

class MedIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'search' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'regex:/^\d+(,\d+)*$/'],
            'departments' => ['nullable', 'regex:/^\d+(,\d+)*$/'],
            'organizations' => ['nullable', 'regex:/^\d+(,\d+)*$/'],
        ];
    }
}
