<?php

namespace Modules\Integration\Http\Requests\Station;

use Illuminate\Foundation\Http\FormRequest;

class StationIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => 'nullable|integer|max:200',
            'search' => 'nullable|string',
        ];
    }
}
