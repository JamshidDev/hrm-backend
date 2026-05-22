<?php

namespace Modules\Turnstile\Http\Requests\HikCentralWorker;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralWorkerShowRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'integer'],
        ];
    }
}
