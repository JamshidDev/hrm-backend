<?php

namespace Modules\HR\Http\Requests\WorkerApplication;

use Illuminate\Foundation\Http\FormRequest;

class ApplicationConfirmationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'status' => ['nullable', 'string'],
            'key' => ['required', 'string'],
        ];
    }
}
