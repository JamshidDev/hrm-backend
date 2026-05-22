<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileWorkerScheduleUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_turnstile' => ['nullable', 'boolean'],
            'start_minute' => ['nullable', 'integer', 'min:0'],
            'end_minute' => ['nullable', 'integer', 'min:0'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
