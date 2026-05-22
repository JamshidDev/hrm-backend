<?php

namespace Modules\HR\Http\Requests\OrganizationLeader;

use Illuminate\Foundation\Http\FormRequest;

class OrganizationLeaderUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phones'   => ['nullable', 'array'],
            'phones.*' => ['string'],
        ];
    }
}
