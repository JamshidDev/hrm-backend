<?php

namespace App\Http\Requests\Deploy;

use Illuminate\Foundation\Http\FormRequest;

class DeployStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'changes' => ['required', 'string'],
            'version' => ['required', 'string'],
            'published' => ['nullable', 'boolean'],
        ];
    }
}
