<?php

namespace Modules\Exam\Http\Requests\TopicExamQuestion;

use Illuminate\Foundation\Http\FormRequest;

class ImportQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx,csv'],
            'startRow' => ['sometimes', 'integer', 'min:0'],
            'mapping' => ['required'],
        ];
    }
}
