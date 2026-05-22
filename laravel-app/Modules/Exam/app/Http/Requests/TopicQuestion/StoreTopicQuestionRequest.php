<?php

namespace Modules\Exam\Http\Requests\TopicQuestion;

use Illuminate\Foundation\Http\FormRequest;

class StoreTopicQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ques' => ['required'],
            'options' => ['required', 'array', 'min:3'],
            'options.*.text' => ['required'],
            'options.*.is_correct' => ['required', 'boolean'],
        ];
    }
}
