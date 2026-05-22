<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'old_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
            'new_password_confirmation' => ['required', 'string', 'min:8', 'same:new_password'],
        ];
    }
}
