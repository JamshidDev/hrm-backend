<?php

namespace Modules\HR\Http\Requests\ConfirmationWorker;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmationWorkerIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer'],
            'search' => ['nullable', 'string']
        ];
    }
}
