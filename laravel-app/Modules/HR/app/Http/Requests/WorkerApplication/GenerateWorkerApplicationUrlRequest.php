<?php

namespace Modules\HR\Http\Requests\WorkerApplication;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerApplicationUrlDTO;

class GenerateWorkerApplicationUrlRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'director_id' => ['required', 'integer'],
            'type' => ['required', 'integer'],
            'from_date' => ['required', 'date'],
            'department_position_id' => ['nullable', 'integer'],
            'worker_position_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): WorkerApplicationUrlDTO
    {
        return new WorkerApplicationUrlDTO(
            directorId: $this->validated('director_id'),
            type: $this->validated('type'),
            fromDate: $this->validated('from_date'),
            departmentPositionId: $this->validated('department_position_id'),
            workerPositionId: $this->validated('worker_position_id'),
        );
    }
}
