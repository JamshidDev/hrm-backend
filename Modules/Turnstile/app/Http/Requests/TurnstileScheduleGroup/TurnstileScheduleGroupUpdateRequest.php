<?php

namespace Modules\Turnstile\Http\Requests\TurnstileScheduleGroup;

use Illuminate\Foundation\Http\FormRequest;

class TurnstileScheduleGroupUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string',
            'end_date' => 'date'
        ];
    }
}
