<?php

namespace Modules\Exam\Http\Requests\Result;

use Illuminate\Foundation\Http\FormRequest;

class DownloadResultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required'],
        ];
    }
}
