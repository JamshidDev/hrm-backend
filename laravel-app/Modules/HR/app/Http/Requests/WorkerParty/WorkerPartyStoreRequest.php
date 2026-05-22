<?php

namespace Modules\HR\Http\Requests\WorkerParty;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPartyDTO;

class WorkerPartyStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'party' => ['required', 'integer'],
            'from_date' => ['required', 'date']
        ];
    }

    public function toDto(): WorkerPartyDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerPartyDTO(
            workerId: $workerId,
            party: $this->validated('party'),
            fromDate: $this->validated('from_date')
        );
    }
}
