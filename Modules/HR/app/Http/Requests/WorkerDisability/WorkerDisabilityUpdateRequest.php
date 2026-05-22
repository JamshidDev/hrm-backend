<?php

namespace Modules\HR\Http\Requests\WorkerDisability;

use Illuminate\Foundation\Http\FormRequest;

class WorkerDisabilityUpdateRequest extends FormRequest
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
