<?php

namespace App\Http\Requests\Mobile\Auth;

use Illuminate\Foundation\Http\FormRequest;

class MobileLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'min:9', 'max:9'],
            'password' => ['nullable', 'string', 'min:8'],
            'device_model' => ['required', 'string'],
            'platform' => ['required', 'string'],
            'login_type' => ['required', 'string', 'in:password,face'],
            'photo' => ['nullable', 'string'],
            'session_id' => ['nullable', 'string'],
        ];
    }
}
