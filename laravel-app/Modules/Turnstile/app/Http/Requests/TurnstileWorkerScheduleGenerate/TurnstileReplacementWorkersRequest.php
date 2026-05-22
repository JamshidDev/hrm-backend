<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileReplacementWorkersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_1' => ['required', 'integer'],
            'worker_position_1' => ['required', 'integer'],
            'worker_2' => ['required', 'integer'],
            'worker_position_2' => ['required', 'integer'],
            'date' => ['required', 'date'],
            'status' => ['required', 'boolean'],
        ];
    }
}
