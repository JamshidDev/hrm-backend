<?php

namespace Modules\HR\Http\Requests\WorkerAcademicTitle;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerAcademicTitleDTO;

class WorkerAcademicTitleUpdateRequest extends FormRequest
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

    public function toDto(int $workerId): WorkerAcademicTitleDTO
    {
        return new WorkerAcademicTitleDTO(
            workerId: $workerId,
            type: $this->validated('type'),
            file: $this->file('file')
        );
    }
}
