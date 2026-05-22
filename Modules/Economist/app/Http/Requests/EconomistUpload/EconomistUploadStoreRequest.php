<?php

namespace Modules\Economist\Http\Requests\EconomistUpload;

use Illuminate\Foundation\Http\FormRequest;

class EconomistUploadStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file'],
            'type' => ['required', 'integer', 'in:1,2,3,4'],
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
        ];
    }
}
