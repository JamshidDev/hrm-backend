<?php

namespace Modules\Structure\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReportDetailUpdateRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'data' => 'required'
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
