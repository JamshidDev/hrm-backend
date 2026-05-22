<?php

namespace Modules\HR\Http\Requests\ConfirmationWorker;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\ConfirmationWorkerDTO;

class ConfirmationWorkerStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'exists:workers,id'],
            'position' => ['required', 'string'],
            'level' => ['required', 'integer'],
        ];
    }

    public function toDto(): ConfirmationWorkerDTO
    {
        $user = $this->user();

        return new ConfirmationWorkerDTO(
            workerId: $this->validated('worker_id'),
            position: $this->validated('position'),
            level: $this->validated('level'),
            organizationId: $user->organization_id
        );
    }
}
