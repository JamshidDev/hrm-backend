<?php

namespace App\Http\Requests\AdminUser;

use Illuminate\Foundation\Http\FormRequest;

class AdminUserAssignRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
        ];
    }
}
