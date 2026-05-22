<?php

namespace Modules\Exam\Http\Requests\TopicExamQuestion;

use Illuminate\Foundation\Http\FormRequest;

class AttachQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'questions' => ['required', 'array'],
            'questions.*.exam_category_id' => ['required', 'integer'],
            'questions.*.count' => ['required', 'integer'],
        ];
    }
}
