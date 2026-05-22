<?php

namespace App\Http\Requests\Mobile\Auth;

use Illuminate\Foundation\Http\FormRequest;

class MobileRefreshRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'refresh_token' => ['nullable', 'string'],
        ];
    }
}
