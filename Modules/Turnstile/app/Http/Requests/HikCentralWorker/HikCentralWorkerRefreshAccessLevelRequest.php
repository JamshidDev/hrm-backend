<?php

namespace Modules\Turnstile\Http\Requests\HikCentralWorker;

use Illuminate\Foundation\Http\FormRequest;

class HikCentralWorkerRefreshAccessLevelRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'access_level_id' => ['required'],
        ];
    }
}
