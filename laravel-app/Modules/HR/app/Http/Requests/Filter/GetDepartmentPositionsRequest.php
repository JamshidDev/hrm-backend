<?php

namespace Modules\HR\Http\Requests\Filter;

use Illuminate\Foundation\Http\FormRequest;

class GetDepartmentPositionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
        ];
    }
}
