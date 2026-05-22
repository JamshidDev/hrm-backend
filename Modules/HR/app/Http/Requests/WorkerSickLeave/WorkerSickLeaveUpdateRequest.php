<?php

namespace Modules\HR\Http\Requests\WorkerSickLeave;

use Illuminate\Foundation\Http\FormRequest;

class WorkerSickLeaveUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_position_id' => ['required', 'integer', 'exists:worker_positions,id'],
            'from_date' => ['required', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'sick' => ['nullable', 'array'],
            'type' => ['nullable', 'integer'],
        ];
    }
}
