<?php

namespace Modules\HR\Http\Requests\WorkerRelativeDisability;

use Illuminate\Foundation\Http\FormRequest;

class WorkerRelativeDisabilityUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'level' => ['required'],
            'number' => ['required'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'comment' => ['nullable', 'string'],
        ];
    }
}
