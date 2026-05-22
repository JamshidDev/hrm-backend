<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class MySchedulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_position_id' => ['required', 'integer'],
            'year' => ['nullable', 'integer'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ];
    }
}
