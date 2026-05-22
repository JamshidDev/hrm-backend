<?php

namespace Modules\Integration\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class GetStatementMonthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => 'required|string|exists:workers,uuid',
        ];
    }
}
