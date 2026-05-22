<?php

namespace Modules\HR\Http\Requests\Command;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'command_type' => ['required', 'integer'],
            'director_id' => ['required', 'integer', 'exists:confirmation_workers,id'],
            'worker_position_id' => ['nullable', 'integer', 'exists:worker_positions,id'],
            'status' => ['nullable', 'string'],
            'stats' => ['sometimes', 'array'],
            'command_date' => ['required', 'date'],
            'command_additional' => ['nullable', 'array'],
            'command_number' => ['string', 'regex:/^[^&<>]*$/'],
            'confirmations' => ['nullable', 'array'],
            'contract_to_date' => ['nullable', 'date'],
            'finance_id' => ['nullable', 'integer'],
            'organization_id' => ['nullable', 'integer'],
            'workers' => ['nullable', 'array'],
            'base' => ['nullable', 'string'],
            'reason' => ['nullable'],
            'new_date' => ['nullable'],
            'work_day' => ['nullable'],
            'all_day' => ['nullable'],
            'period_from' => ['nullable'],
            'period_to' => ['nullable'],
            'half_one_day' => ['nullable'],
            'half_one_base' => ['nullable'],
            'half_two_day' => ['nullable'],
            'half_two_base' => ['nullable'],
            'worker_positions' => ['nullable', 'array'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'additional' => ['nullable', 'array'],
            'vacation_reason_day' => ['nullable', 'integer'],
            'vacation_reason_type' => ['nullable', 'string'],
            'vacation_finish_status' => ['nullable', 'integer'],
            'vacation_id' => ['nullable', 'integer'],
            'vacation_status' => ['nullable', 'integer'],
            'child_age' => ['nullable'],
            'contract_date' => ['nullable', 'date'],
            'half_two_date' => ['nullable', 'date'],
            'rest_day' => ['nullable']
        ];
    }

    public function validatedData(): array
    {
        return $this->validated();
    }
}
