<?php

namespace Modules\Chat\Http\Requests\ChatNews;

use Illuminate\Foundation\Http\FormRequest;

class ChatNewsReactionRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'reaction' => 'required|in:1,-1'
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
