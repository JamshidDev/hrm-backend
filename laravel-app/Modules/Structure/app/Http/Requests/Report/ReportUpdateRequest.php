<?php

namespace Modules\Structure\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReportUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'director_id' => 'required|integer'
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
