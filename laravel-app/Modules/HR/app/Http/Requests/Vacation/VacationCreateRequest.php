<?php

namespace Modules\HR\Http\Requests\Vacation;

use Illuminate\Foundation\Http\FormRequest;

class VacationCreateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'worker_positions' => ['required', 'array'],
            'worker_positions.*' => ['integer'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
