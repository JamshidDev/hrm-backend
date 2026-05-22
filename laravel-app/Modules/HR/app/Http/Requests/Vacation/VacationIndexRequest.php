<?php

namespace Modules\HR\Http\Requests\Vacation;

use Illuminate\Foundation\Http\FormRequest;

class VacationIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string'],
            'worker_position_id' => ['nullable', 'integer'],
            'vacation_type' => ['nullable', 'integer'],
            'download' => ['nullable'],
            'organizations' => ['nullable', 'string'],
        ];
    }
}
