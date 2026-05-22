<?php

namespace Modules\Economist\Http\Requests\Economist;

use Illuminate\Foundation\Http\FormRequest;

class EconomistUpdateUploadStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'exists:organizations,id'],
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'status' => ['nullable', 'boolean'],
        ];
    }
}
