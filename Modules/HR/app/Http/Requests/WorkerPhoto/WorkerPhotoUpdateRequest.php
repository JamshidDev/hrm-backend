<?php

namespace Modules\HR\Http\Requests\WorkerPhoto;

use Illuminate\Foundation\Http\FormRequest;

class WorkerPhotoUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo'   => ['nullable', 'string'],
            'current' => ['nullable', 'boolean'],
        ];
    }
}
