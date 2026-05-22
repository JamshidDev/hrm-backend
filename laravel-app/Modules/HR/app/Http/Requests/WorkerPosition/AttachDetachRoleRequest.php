<?php

namespace Modules\HR\Http\Requests\WorkerPosition;

use Illuminate\Foundation\Http\FormRequest;

class AttachDetachRoleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'role'            => 'sometimes|required|string',
            'role_id'         => 'sometimes|required|exists:roles,id',
            'organization_id' => 'required|exists:organizations,id',
        ];
    }
}
