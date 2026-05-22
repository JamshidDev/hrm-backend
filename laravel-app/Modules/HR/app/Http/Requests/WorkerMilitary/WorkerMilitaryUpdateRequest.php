<?php

namespace Modules\HR\Http\Requests\WorkerMilitary;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerMilitaryDTO;
use Modules\HR\Services\WorkerMilitaryServiceService;

class WorkerMilitaryUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'        => ['required', 'boolean'],
            'name'          => ['required_if:status,1'],
            'number'        => ['required_if:status,1'],
            'speciality'    => ['required_if:status,1'],
            'commissariat'  => ['required_if:status,1'],
        ];
    }

    public function toDto($service): WorkerMilitaryDto
    {
        return new WorkerMilitaryDto(
            workerId: $service->worker_id,
            status: (bool) $this->validated('status'),
            name: $this->validated('name'),
            number: $this->validated('number'),
            speciality: $this->validated('speciality'),
            commissariat: $this->validated('commissariat'),
        );
    }
}
