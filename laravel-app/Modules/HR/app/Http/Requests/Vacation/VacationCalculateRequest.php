<?php

namespace Modules\HR\Http\Requests\Vacation;

use Illuminate\Foundation\Http\FormRequest;

class VacationCalculateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'worker_positions' => ['required', 'array'],
            'worker_positions.*.id' => ['required', 'integer'],
            'worker_positions.*.from' => ['required', 'date'],
            'worker_positions.*.main_day' => ['required', 'integer'],
            'worker_positions.*.second_day' => ['required', 'integer'],
            'worker_positions.*.additional' => ['nullable'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
