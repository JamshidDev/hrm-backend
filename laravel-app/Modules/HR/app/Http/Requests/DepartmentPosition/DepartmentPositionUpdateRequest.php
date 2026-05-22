<?php

namespace Modules\HR\Http\Requests\DepartmentPosition;

use Illuminate\Foundation\Http\FormRequest;

class DepartmentPositionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'position_id'   => ['required', 'exists:positions,id'],
            'rate'          => ['required', 'numeric'],
            'education' => ['required', 'integer'],
            'rank' => ['required'],
            'salary' => ['required'],
            'experience' => ['required'],
            'group' => ['required'],
            'max_rank'      => ['required'],
        ];
    }
}
