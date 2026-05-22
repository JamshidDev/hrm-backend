<?php

namespace Modules\Exam\Http\Requests\TopicFile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTopicFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'active' => ['required'],
            'file' => ['sometimes', 'file'],
        ];
    }
}
