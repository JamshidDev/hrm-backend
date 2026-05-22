<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsMediaStoreRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'chat_news_id' => 'required|exists:chat_news,id',
            'type' => 'required|string',
            'file' => 'required|file',
            'order' => 'nullable|integer'
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
