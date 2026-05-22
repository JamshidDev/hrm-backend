<?php

namespace Modules\Exam\Http\Requests\ExamCategory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required'],
        ];
    }
}
