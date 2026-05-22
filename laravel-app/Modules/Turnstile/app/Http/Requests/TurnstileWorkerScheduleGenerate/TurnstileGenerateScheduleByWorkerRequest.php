<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileGenerateScheduleByWorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'schedule_type' => ['nullable','integer'],
            'start_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'worker_position_ids' => ['nullable', 'array'],
            'worker_position_ids.*' => ['nullable','integer'],
            'schedule_workers' => ['nullable', 'array'],
            'group_id' => ['nullable', 'integer'],
            'status' => ['nullable']
        ];
    }
}
