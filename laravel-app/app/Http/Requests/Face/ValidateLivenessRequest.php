<?php

namespace App\Http\Requests\Face;

use Illuminate\Foundation\Http\FormRequest;

class ValidateLivenessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'session_id' => ['required', 'string'],
        ];
    }
}
