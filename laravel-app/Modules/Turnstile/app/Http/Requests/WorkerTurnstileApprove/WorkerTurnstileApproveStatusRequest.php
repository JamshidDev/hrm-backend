<?php

namespace Modules\Turnstile\Http\Requests\WorkerTurnstileApprove;

use Illuminate\Foundation\Http\FormRequest;

class WorkerTurnstileApproveStatusRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:approved,rejected'],
        ];
    }
}
