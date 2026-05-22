<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsStoreRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'slug' => 'sometimes|string|unique:chat_news,slug',
            'status' => 'sometimes|integer',
            'published_at' => 'sometimes|date',
            'is_pinned' => 'sometimes|boolean',

            'translations' => 'nullable|array|min:1',
            'translations.*.locale' => 'required|string|size:2',
            'translations.*.title' => 'required|string',
            'translations.*.short_description' => 'nullable|string',
            'translations.*.content' => 'nullable|string',

            'media' => 'nullable|array',
            'media.*.type' => 'required|string',
            'media.*.file' => 'required|file',
            'media.*.order' => 'nullable|integer',

            'categories' => 'nullable|array'
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
