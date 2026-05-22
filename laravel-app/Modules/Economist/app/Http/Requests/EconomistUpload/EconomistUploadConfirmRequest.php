<?php

namespace Modules\Economist\Http\Requests\EconomistUpload;

use Illuminate\Foundation\Http\FormRequest;

class EconomistUploadConfirmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'integer', 'in:1,2,3,4'],
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
        ];
    }
}
