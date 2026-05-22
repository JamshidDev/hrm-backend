<?php

namespace Modules\Exam\Http\Requests\TopicExam;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required'],
            'variant' => ['sometimes', 'required'],
            'deadline' => ['sometimes', 'required'],
            'active' => ['sometimes', 'required'],
            'minute' => ['sometimes', 'required'],
            'whom' => ['sometimes', 'required'],
            'tests_count' => ['sometimes', 'required'],
            'chances' => ['sometimes', 'required'],
            'description' => ['sometimes', 'string'],
            'camera' => ['nullable'],
            'whom_ids' => ['sometimes', 'array'],
        ];
    }
}
