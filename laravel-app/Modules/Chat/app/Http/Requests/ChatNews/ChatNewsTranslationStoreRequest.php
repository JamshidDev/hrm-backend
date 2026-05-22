<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsTranslationStoreRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'chat_news_id' => 'required|exists:chat_news,id',
            'locale' => 'required|string|size:2',
            'title' => 'required|string',
            'short_description' => 'nullable|string',
            'content' => 'nullable|string',
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
