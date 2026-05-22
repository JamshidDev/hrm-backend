<?php

namespace App\Http\Requests\Telegram;

use Illuminate\Foundation\Http\FormRequest;

class TelegramDetachRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'chat_ids' => ['required', 'array'],
            'chat_ids.*' => ['string'],
        ];
    }
}
