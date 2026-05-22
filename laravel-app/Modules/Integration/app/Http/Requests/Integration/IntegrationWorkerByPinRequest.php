<?php

namespace Modules\Integration\Http\Requests\Integration;

use Illuminate\Foundation\Http\FormRequest;

class IntegrationWorkerByPinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pin' => 'required|exists:workers,pin'
        ];
    }
}
