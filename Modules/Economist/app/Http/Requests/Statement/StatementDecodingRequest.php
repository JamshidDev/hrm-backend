<?php

namespace Modules\Economist\Http\Requests\Statement;

use Illuminate\Foundation\Http\FormRequest;

class StatementDecodingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['nullable', 'integer', 'min:2010', 'max:2030'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'organizations' => ['nullable', 'string'],
            'download' => ['nullable'],
        ];
    }
}
