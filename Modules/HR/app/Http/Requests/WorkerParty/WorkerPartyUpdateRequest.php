<?php

namespace Modules\HR\Http\Requests\WorkerParty;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPartyDTO;

class WorkerPartyUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'party' => ['required', 'integer'],
            'from_date' => ['required', 'date']
        ];
    }


    public function authorize(): bool
    {
        return true;
    }

    public function toDto(int $workerId): WorkerPartyDTO
    {
        return new WorkerPartyDTO(
            workerId: $workerId,
            party: $this->validated('party'),
            fromDate: $this->validated('from_date')
        );
    }
}
