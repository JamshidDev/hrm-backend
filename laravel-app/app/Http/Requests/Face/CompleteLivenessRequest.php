<?php

namespace App\Http\Requests\Face;

use Illuminate\Foundation\Http\FormRequest;

class CompleteLivenessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'session_id' => ['required', 'string'],
            'refImage' => ['nullable', 'string'],
            'liveImage' => ['nullable', 'string'],
            'success' => ['nullable', 'boolean'],
            'faceStatus' => ['nullable', 'string'],
        ];
    }
}
