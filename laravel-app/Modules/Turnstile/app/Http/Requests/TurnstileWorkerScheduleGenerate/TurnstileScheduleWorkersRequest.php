<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileScheduleWorkersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'department_id' => ['nullable', 'integer'],
            'has_schedule' => ['nullable', 'in:Yes,No'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
