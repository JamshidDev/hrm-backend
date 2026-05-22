<?php

namespace Modules\HR\Http\Requests\Pensioner;

use Illuminate\Foundation\Http\FormRequest;

class PensionerIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string']
        ];
    }
}
