<?php

namespace Modules\HR\Http\Requests\WorkerApplication;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerApplicationDTO;

class StoreWorkerApplicationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'director_id' => ['required', 'exists:confirmation_workers,id'],
            'type' => ['required', 'integer'],
            'confirmations' => ['nullable', 'array'],
            'worker_position_id' => ['nullable', 'exists:worker_positions,id'],
        ];
    }

    public function toDto(): WorkerApplicationDTO
    {
        return new WorkerApplicationDTO(
            directorId: $this->validated('director_id'),
            type: (int)$this->validated('type'),
            workerPositionId: $this->validated('worker_position_id'),
            confirmations: $this->validated('confirmations') ?? [],
            payload: $this->all()
        );
    }
}
