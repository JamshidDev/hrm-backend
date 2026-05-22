<?php

namespace Modules\Structure\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReportCreateConfirmationRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'confirmation_id' => 'required',
            'report' => 'required|uuid'
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
