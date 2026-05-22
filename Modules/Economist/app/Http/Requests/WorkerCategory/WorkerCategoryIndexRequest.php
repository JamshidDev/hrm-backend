<?php

namespace Modules\Economist\Http\Requests\WorkerCategory;

use Illuminate\Foundation\Http\FormRequest;

class WorkerCategoryIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['nullable', 'integer', 'min:2010', 'max:2030'],
        ];
    }
}
