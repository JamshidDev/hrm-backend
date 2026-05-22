<?php

namespace App\Http\Requests\AdminUser;

use Illuminate\Foundation\Http\FormRequest;

class AdminUserGenerateTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_uuid' => ['required', 'uuid', 'exists:users,uuid'],
        ];
    }
}
