<?php

namespace Modules\Turnstile\Http\Requests\WorkerTurnstileApprove;

use Illuminate\Foundation\Http\FormRequest;

class WorkerTurnstileApproveStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'worker_position_ids' => ['required'],
            'receiver_organization_id' => ['required', 'integer'],
            'access_levels' => ['required', 'array'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'approval_id' => ['nullable', 'integer'],
        ];
    }
}
