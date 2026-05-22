<?php

namespace Modules\Structure\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReportExcelRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => 'required|in:one,two,three',
            'report' => 'nullable|uuid',
            'year' => 'nullable|integer',
            'month' => 'nullable|in:1,2,3,4,5,6,7,8,9,10,11,12',
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
