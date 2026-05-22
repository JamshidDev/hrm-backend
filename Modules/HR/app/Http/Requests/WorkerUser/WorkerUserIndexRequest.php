<?php

namespace Modules\HR\Http\Requests\WorkerUser;

use Illuminate\Foundation\Http\FormRequest;

class WorkerUserIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' =>  ['nullable', 'integer', 'min:1', 'max:1000'],
            'search' => ['nullable', 'string', 'max:50'],
            'organizations' => ['nullable', 'regex:/^\d+(,\d+)*$/'],
            'role' => ['nullable', 'string']
        ];
    }
}
