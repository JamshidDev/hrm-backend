<?php

namespace Modules\HR\Http\Requests\WorkerPosition;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkerPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id'        => 'sometimes|required|exists:organizations,id',
            'department_position_id' => 'sometimes|required|exists:department_positions,id',
            'contract_number'        => 'required',
            'contract_date'          => 'required|date',
            'group'                  => 'required',
            'rank'                   => 'required',
            'rate'                   => 'required|numeric',
            'type'                   => 'required',
            'salary'                 => 'required|numeric',
            'schedule_id'            => 'required|exists:schedules,id',
            'position_date'          => 'required|date',
        ];
    }
}
