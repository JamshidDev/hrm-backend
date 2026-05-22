<?php

namespace App\Http\Requests\Mobile\Auth;

use Illuminate\Foundation\Http\FormRequest;

class MobileUpdateFcmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fcm_token' => ['nullable', 'string'],
            'notification' => ['nullable', 'boolean'],
        ];
    }
}
