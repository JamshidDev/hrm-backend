<?php

namespace Modules\HR\Http\Requests\OrganizationDocument;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrganizationDocumentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'document_date' => 'sometimes|date',
            'visibility_type' => ['required', Rule::in(['OWN', 'OWN_AND_BELOW', 'ALL'])],
            'file' => 'sometimes|nullable|file|mimes:pdf,doc,docx,xlsx,xls',
        ];
    }
}
