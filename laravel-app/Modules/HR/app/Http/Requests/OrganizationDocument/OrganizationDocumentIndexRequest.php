<?php

namespace Modules\HR\Http\Requests\OrganizationDocument;

use Illuminate\Foundation\Http\FormRequest;

class OrganizationDocumentIndexRequest extends FormRequest
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
