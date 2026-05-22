<?php

namespace Modules\Exam\Http\Requests\ExamVideo;

use Illuminate\Foundation\Http\FormRequest;

class FinishExamVideoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_exam_id' => ['required', 'exists:worker_exams,id'],
        ];
    }
}
