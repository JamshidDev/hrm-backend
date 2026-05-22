<?php

namespace Modules\Exam\Http\Requests\Topic;

use Illuminate\Foundation\Http\FormRequest;

class StoreTopicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required'],
            'type' => ['required'],
            'organizations' => ['required', 'array'],
        ];
    }
}
