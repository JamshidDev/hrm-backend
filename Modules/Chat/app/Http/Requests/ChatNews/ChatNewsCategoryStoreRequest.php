<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsCategoryStoreRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|array',
            'name.uz' => 'required|string',
            'name.ru' => 'nullable|string',
            'name.en' => 'nullable|string',
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
