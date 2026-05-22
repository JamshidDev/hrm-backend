<?php

namespace Modules\Turnstile\Http\Requests\HikCentralWorker;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralWorkerUpdateFaceRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'integer'],
            'worker_id' => ['nullable', 'integer'],
            'photo_id' => ['nullable', 'integer'],
            'photo' => ['nullable', 'string'],
            'to' => ['nullable', 'date'],
            'access_level_ids' => ['nullable', 'array'],
            'access_level_ids.*' => ['integer'],
        ];
    }
}
