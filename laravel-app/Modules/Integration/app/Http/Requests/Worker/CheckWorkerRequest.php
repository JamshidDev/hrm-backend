<?php

namespace Modules\Integration\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class CheckWorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pin' => 'required|string|max:14|min:14|exists:workers,pin'
        ];
    }
}
