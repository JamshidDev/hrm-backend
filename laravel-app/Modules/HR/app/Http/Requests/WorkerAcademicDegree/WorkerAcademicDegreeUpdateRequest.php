<?php

namespace Modules\HR\Http\Requests\WorkerAcademicDegree;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerAcademicDegreeDTO;

class WorkerAcademicDegreeUpdateRequest extends FormRequest
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

    public function toDto(int $workerId): WorkerAcademicDegreeDTO
    {
        return new WorkerAcademicDegreeDTO(
            workerId: $workerId,
            type: $this->validated('type'),
            file: $this->file('file')
        );
    }
}
