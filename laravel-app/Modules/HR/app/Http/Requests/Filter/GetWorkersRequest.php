<?php

namespace Modules\HR\Http\Requests\Filter;

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
            'organization_id' => ['required', 'integer'],
            'per_page' => ['nullable', 'integer'],
        ];
    }
}
