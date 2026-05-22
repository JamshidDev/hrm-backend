<?php

namespace App\Http\Requests\Deploy;

use Illuminate\Foundation\Http\FormRequest;

class DeployIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
