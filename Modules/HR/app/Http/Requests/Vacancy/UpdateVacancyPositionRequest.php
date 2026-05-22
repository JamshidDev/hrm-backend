<?php

namespace Modules\HR\Http\Requests\Vacancy;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVacancyPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_position_id' => 'sometimes|required|exists:department_positions,id',
            'work_type' => 'sometimes|required',
            'rate' => 'sometimes|required|numeric',
            'education' => 'sometimes|required',
            'address' => 'sometimes|required|string',
            'city_id' => 'sometimes|required|exists:cities,id',
            'salary' => 'sometimes|required|numeric',
            'salary_status' => 'sometimes|boolean',
            'phd_status' => 'sometimes|boolean',
            'experience' => 'sometimes|required|integer',
            'to' => 'sometimes|required|date',
            'position_obligations' => 'sometimes|required',
            'qualification_requirements' => 'sometimes|required',
            'working_conditions' => 'sometimes|required',
            'specialties' => 'sometimes|required',
            'status' => 'sometimes|required',
        ];
    }
}
