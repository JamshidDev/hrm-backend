<?php

namespace Modules\Turnstile\Http\Requests\TurnstileScheduleGroup;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileScheduleGroupIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string'],
            'organizations' => ['nullable', 'string'],
            'schedule_type' => ['nullable', 'integer']
        ];
    }
}
