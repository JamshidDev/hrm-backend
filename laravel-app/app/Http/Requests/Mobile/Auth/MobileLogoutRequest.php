<?php

namespace App\Http\Requests\Mobile\Auth;

use Illuminate\Foundation\Http\FormRequest;

class MobileLogoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_uuid' => ['required', 'string'],
        ];
    }
}
