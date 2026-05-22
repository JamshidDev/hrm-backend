<?php

namespace Modules\Structure\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReportStoreRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'confirmations' => 'required|array',
            'director_id' => 'required|integer',
            'report' => 'required|uuid',
            'data' => 'required|array'
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
