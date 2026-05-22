<?php

namespace Modules\HR\Http\Requests\OrganizationDocument;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrganizationDocumentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'document_date' => 'nullable|date',
            'type' => 'required|string',
            'file' => 'required|file|mimes:pdf,doc,docx,xlsx,xls',
            'visibility_type' => ['required', Rule::in(['OWN', 'OWN_AND_BELOW', 'ALL'])],
        ];
    }
}
