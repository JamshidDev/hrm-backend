<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileWorkerScheduleIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'organization_id' => ['nullable', 'integer'],
            'department_id' => ['nullable', 'integer'],
            'schedule_type' => ['nullable'],
            'has_schedule' => ['nullable', 'in:Yes,No'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:400'],
        ];
    }
}
