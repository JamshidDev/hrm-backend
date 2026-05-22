<?php

namespace Modules\HR\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;

class ContractStoreRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'number' => 'required',
            'contract_date' => 'date',
            'organization_id' => 'required|exists:organizations,id',
            'type' => 'required',
            'position_date' => 'date',
            'schedule_id' => 'required|exists:schedules,id',
            'worker_id' => 'required|exists:workers,id',
            'director_id' => 'required|exists:confirmation_workers,id',
            'command_status' => 'required|boolean',
            'command_type' => 'nullable|integer',
            'probation' => 'nullable',
            'post_name' => 'nullable',
            'salary' => 'nullable',
            'vacation_main_day' => 'nullable',
            'additional_vacation_day' => 'nullable',
            'department_id' => 'nullable',
            'contract_to_date' => 'nullable|date',
            'department_position_id' => 'nullable|exists:department_positions,id',
            'position_id' => 'nullable',
            'command_date' => 'nullable|date',
            'command_number' => ['nullable', 'string', 'regex:/^[^&<>]*$/'],
            'confirmations' => ['nullable', 'array'],
            'group' => 'nullable',
            'rank' => 'nullable',
            'rate' => 'nullable',
            'position_status' => 'nullable',
            'table_number' => 'nullable',
            'temporary_worker_id' => 'nullable',
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
