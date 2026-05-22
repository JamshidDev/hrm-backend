<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileDayInMonthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ];
    }
}
