<?php

namespace Modules\HR\Http\Requests\Command;

use Illuminate\Foundation\Http\FormRequest;

class CheckWorkerPositionAdditionalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['type' => ['required']];
    }
}
