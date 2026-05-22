<?php

namespace Modules\Economist\Http\Requests\StaffingApprove;

use Illuminate\Foundation\Http\FormRequest;

class ApproveGenerateRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'department_positions' => ['required', 'array'],
            'confirmations' => ['required', 'array'],
            'confirmatory_id' => ['required', 'integer'],
            'director_id' => ['required', 'integer'],
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
