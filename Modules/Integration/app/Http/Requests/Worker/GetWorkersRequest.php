<?php

namespace Modules\Integration\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class GetWorkersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pins' => 'required|array',
            'per_page' => 'nullable|integer|max:50',
            'search' => 'nullable|string'
        ];
    }
}
