<?php

namespace Modules\HR\Http\Requests\OrganizationLeader;

use Illuminate\Foundation\Http\FormRequest;

class OrganizationLeaderIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string']
        ];
    }
}
