<?php

namespace Modules\HR\Http\Requests\Vacancy;

use Illuminate\Foundation\Http\FormRequest;

class StoreVacancyPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_position_id' => 'required|exists:department_positions,id',
            'work_type' => 'required',
            'rate' => 'required|numeric',
            'education' => 'required',
            'address' => 'required|string',
            'city_id' => 'required|exists:cities,id',
            'salary' => 'nullable|numeric',
            'salary_status' => 'nullable|boolean',
            'phd_status' => 'nullable|boolean',
            'experience' => 'required|integer',
            'to' => 'required|date',
            'position_obligations' => 'required',
            'qualification_requirements' => 'required',
            'working_conditions' => 'required',
            'specialties' => 'required',
        ];
    }
}
