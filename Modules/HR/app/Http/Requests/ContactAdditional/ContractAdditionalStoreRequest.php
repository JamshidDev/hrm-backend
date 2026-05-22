<?php

namespace Modules\HR\Http\Requests\ContactAdditional;

use Illuminate\Foundation\Http\FormRequest;

class ContractAdditionalStoreRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'worker_position_id' => 'required|exists:worker_positions,id',
            'type' => 'required',
            'number' => 'required',
            'contract_date' => 'required|date',
            'director_id' => 'required|exists:confirmation_workers,id',
            'command_status' => 'required',
            'organization_id' => 'nullable|exists:organizations,id',
            'probation' => 'nullable|integer',
            'post_name' => 'nullable',
            'salary' => 'nullable',
            'vacation_main_day' => 'nullable|integer',
            'additional_vacation_day' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'contract_to_date' => 'nullable|date',
            'department_position_id' => 'nullable|exists:department_positions,id',
            'position_id' => 'nullable|integer',
            'command_date' => 'nullable|date',
            'confirmations' => ['nullable', 'array'],
            'group' => 'nullable',
            'rank' => 'nullable|string',
            'rate' => 'nullable',
            'position_status' => 'nullable',
            'table_number' => 'nullable',
            'command_number' => ['nullable', 'string', 'regex:/^[^&<>]*$/'],
            'temporary_worker_id' => 'nullable|integer',
            'worker_id' => 'nullable|integer',
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
