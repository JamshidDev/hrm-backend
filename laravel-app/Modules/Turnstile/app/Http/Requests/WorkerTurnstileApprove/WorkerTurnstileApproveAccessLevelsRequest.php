<?php

namespace Modules\Turnstile\Http\Requests\WorkerTurnstileApprove;

use Illuminate\Foundation\Http\FormRequest;

class WorkerTurnstileApproveAccessLevelsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'organization_id' => ['nullable', 'integer'],
        ];
    }
}
