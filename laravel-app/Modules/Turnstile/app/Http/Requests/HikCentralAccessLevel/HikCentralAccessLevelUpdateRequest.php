<?php

namespace Modules\Turnstile\Http\Requests\HikCentralAccessLevel;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralAccessLevelUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'hik_central_department_id' => ['required'],
            'devices' => ['required', 'array'],
        ];
    }
}
