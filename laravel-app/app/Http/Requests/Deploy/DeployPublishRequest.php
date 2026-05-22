<?php

namespace App\Http\Requests\Deploy;

use Illuminate\Foundation\Http\FormRequest;

class DeployPublishRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'published' => ['required', 'boolean'],
        ];
    }
}
