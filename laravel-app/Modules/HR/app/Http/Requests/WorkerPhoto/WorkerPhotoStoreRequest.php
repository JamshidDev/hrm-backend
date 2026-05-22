<?php

namespace Modules\HR\Http\Requests\WorkerPhoto;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPhotoDTO;

class WorkerPhotoStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'exists:workers,id'],
            'photo'     => ['required', 'string'],
            'current'   => ['nullable', 'boolean'],
        ];
    }

    public function toDto(): WorkerPhotoDTO
    {
        return new WorkerPhotoDTO(
            workerId: $this->validated('worker_id'),
            photoBase64: $this->validated('photo'),
            current: (bool) ($this->validated('current') ?? false),
        );
    }
}
