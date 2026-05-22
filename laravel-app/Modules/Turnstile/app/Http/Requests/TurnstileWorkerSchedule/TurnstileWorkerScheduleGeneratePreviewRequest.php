<?php

namespace Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileWorkerScheduleGeneratePreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date'],
            'schedule_type' => ['required'],
            'start_day_in_schedule_types' => ['required', 'integer'],
        ];
    }
}
