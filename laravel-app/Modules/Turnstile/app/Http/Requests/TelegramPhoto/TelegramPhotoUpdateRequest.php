<?php

namespace Modules\Turnstile\Http\Requests\TelegramPhoto;

use Illuminate\Foundation\Http\FormRequest;

class TelegramPhotoUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'status' => ['required', 'integer'],
            'comment' => ['nullable', 'string'],
            'access_level_ids' => ['nullable', 'array'],
            'access_level_ids.*' => ['integer'],
            'to' => ['nullable', 'date'],
        ];
    }
}
