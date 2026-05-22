<?php

namespace Modules\Exam\Http\Requests\Result;

use Illuminate\Foundation\Http\FormRequest;

class SendToConfirmationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'confirmations' => ['required', 'array'],
            'confirmations.*' => ['integer'],
            'director' => ['required', 'integer'],
        ];
    }
}
