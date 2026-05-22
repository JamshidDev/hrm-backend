<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileGenerateFactScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_position_id' => ['required', 'integer'],
            'date' => ['required', 'date', 'date_format:Y-m-d'],
        ];
    }
}
