<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsIndexRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string']
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
