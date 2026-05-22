<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationInfoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'command_address' => ['required', 'string'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'address' => ['required', 'string'],
        ];
    }
}
