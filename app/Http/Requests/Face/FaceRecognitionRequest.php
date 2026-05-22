<?php

namespace App\Http\Requests\Face;

use Illuminate\Foundation\Http\FormRequest;

class FaceRecognitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo' => ['required', 'string'],
        ];
    }
}
