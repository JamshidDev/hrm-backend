<?php

namespace Modules\HR\Http\Requests\WorkerMilitary;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerMilitaryDTO;

class WorkerMilitaryStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid'          => ['required', 'uuid'],
            'status'        => ['required', 'boolean'],
            'name'          => ['required_if:status,1'],
            'number'        => ['required_if:status,1'],
            'speciality'    => ['required_if:status,1'],
            'commissariat'  => ['required_if:status,1'],
        ];
    }

    public function toDto(): WorkerMilitaryDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerMilitaryDTO(
            workerId: $workerId,
            status: (bool) $this->validated('status'),
            name: $this->validated('name'),
            number: $this->validated('number'),
            speciality: $this->validated('speciality'),
            commissariat: $this->validated('commissariat'),
        );
    }
}
