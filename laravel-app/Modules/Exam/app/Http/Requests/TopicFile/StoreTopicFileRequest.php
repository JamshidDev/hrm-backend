<?php

namespace Modules\Exam\Http\Requests\TopicFile;

use Illuminate\Foundation\Http\FormRequest;

class StoreTopicFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'active' => ['required'],
            'file' => ['required', 'file'],
        ];
    }
}
