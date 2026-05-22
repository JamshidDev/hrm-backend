<?php

namespace Modules\Turnstile\Http\Requests\HikCentralWorker;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralWorkerStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'integer'],
            'access_level_ids' => ['required', 'array'],
            'access_level_ids.*' => ['integer'],
            'photo_id' => ['nullable', 'integer'],
            'photo' => ['nullable', 'string'],
            'to' => ['nullable', 'date'],
        ];
    }
}
