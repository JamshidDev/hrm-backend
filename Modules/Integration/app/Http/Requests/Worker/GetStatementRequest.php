<?php

namespace Modules\Integration\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class GetStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => 'required|string|exists:workers,uuid',
            'year' => 'required|integer|min:2010|max:2030',
            'month' => 'required|integer|min:1|max:12',
        ];
    }
}
