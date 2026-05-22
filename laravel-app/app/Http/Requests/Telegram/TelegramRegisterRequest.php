<?php

namespace App\Http\Requests\Telegram;

use Illuminate\Foundation\Http\FormRequest;

class TelegramRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'string'],
            'chat_id' => ['required', 'integer'],
        ];
    }
}
