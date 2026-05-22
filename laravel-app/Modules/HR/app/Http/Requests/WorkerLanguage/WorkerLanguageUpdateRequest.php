<?php

namespace Modules\HR\Http\Requests\WorkerLanguage;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerLanguageDTO;

class WorkerLanguageUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'language_id'  => ['required', 'exists:languages,id'],
            'file'           => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx', 'max:4096'],
        ];
    }

    public function toDto(int $workerId): WorkerLanguageDTO
    {
        return new WorkerLanguageDTO(
            workerId: $workerId,
            languageId: $this->validated('language_id'),
            file: $this->file('file')
        );
    }
}
