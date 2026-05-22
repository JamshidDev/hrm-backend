<?php

namespace Modules\Turnstile\Http\Requests\HikCentralAccessLevel;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralOrganizationAccessLevelAttachRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'access_levels' => ['sometimes', 'array'],
            'organization_id' => ['required', 'exists:organizations,id'],
        ];
    }
}
