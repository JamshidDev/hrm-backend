<?php

namespace App\Http\Requests\Deploy;

use Illuminate\Foundation\Http\FormRequest;

class DeployUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'zip' => ['required', 'file', 'mimes:zip'],
            'changes' => ['nullable', 'string'],
            'published' => ['nullable', 'boolean'],
        ];
    }
}
