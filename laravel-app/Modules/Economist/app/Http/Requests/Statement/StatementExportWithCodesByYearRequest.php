<?php

namespace Modules\Economist\Http\Requests\Statement;

use Illuminate\Foundation\Http\FormRequest;

class StatementExportWithCodesByYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'type' => ['required', 'string'],
        ];
    }
}
