<?php

namespace Modules\Exam\Http\Requests\WorkerExam;

use Illuminate\Foundation\Http\FormRequest;

class SendResultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'result' => ['required', 'integer'],
        ];
    }
}
