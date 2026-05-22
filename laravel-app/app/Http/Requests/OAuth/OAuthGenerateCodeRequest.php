<?php

namespace App\Http\Requests\OAuth;

use Illuminate\Foundation\Http\FormRequest;

class OAuthGenerateCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => ['required', 'string'],
            'state' => ['required', 'string'],
            'scope' => ['required', 'string'],
        ];
    }
}
