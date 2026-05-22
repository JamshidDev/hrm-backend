<?php

namespace App\Http\Requests\OAuth;

use Illuminate\Foundation\Http\FormRequest;

class OAuthCheckCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string'],
            'client_id' => ['required', 'string'],
            'client_secret' => ['nullable', 'string'],
        ];
    }
}
