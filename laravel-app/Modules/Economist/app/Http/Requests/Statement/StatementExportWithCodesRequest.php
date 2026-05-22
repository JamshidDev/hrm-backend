<?php

namespace Modules\Economist\Http\Requests\Statement;

use Illuminate\Foundation\Http\FormRequest;

class StatementExportWithCodesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'codes' => ['required', 'array'],
            'codes.*' => ['required'],
            'type' => ['required', 'string', 'in:organizations,workers'],
        ];
    }
}
