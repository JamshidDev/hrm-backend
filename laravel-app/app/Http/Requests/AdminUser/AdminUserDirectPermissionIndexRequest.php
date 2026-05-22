<?php

namespace App\Http\Requests\AdminUser;

use Illuminate\Foundation\Http\FormRequest;

class AdminUserDirectPermissionIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organizations' => ['nullable', 'string'],
            'permission_id' => ['nullable', 'integer', 'exists:permissions,id'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}