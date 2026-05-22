<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class MonthStatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:absent,early,leave,entry,late'],
            'year' => ['required', 'integer', 'min:2025', 'max:' . date('Y')],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ];
    }
}
