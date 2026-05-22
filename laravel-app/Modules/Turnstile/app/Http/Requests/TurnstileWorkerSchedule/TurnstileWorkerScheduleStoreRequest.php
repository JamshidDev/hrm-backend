<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileWorkerScheduleStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'days' => ['required', 'array'],
        ];
    }
}
