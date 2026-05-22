<?php

namespace App\Http\Requests\Role;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($this->route('role')?->id),
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['integer', 'distinct', 'exists:permissions,id'],
        ];
    }
}
