<?php

namespace Modules\Turnstile\Http\Requests\TelegramPhoto;

use Illuminate\Foundation\Http\FormRequest;

class TelegramPhotoIndexRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'departments' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
