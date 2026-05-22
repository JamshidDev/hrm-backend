<?php

namespace Modules\Exam\Http\Requests\TopicExam;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required'],
            'variant' => ['required'],
            'deadline' => ['required'],
            'minute' => ['required'],
            'whom' => ['required'],
            'camera' => ['nullable'],
            'tests_count' => ['required'],
            'chances' => ['required'],
            'description' => ['sometimes', 'string'],
            'whom_ids' => ['sometimes', 'array'],
        ];
    }
}
