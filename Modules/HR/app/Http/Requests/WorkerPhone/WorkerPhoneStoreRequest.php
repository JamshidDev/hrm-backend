<?php

namespace Modules\HR\Http\Requests\WorkerPhone;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Modules\HR\DTO\WorkerPhoneDTO;

class WorkerPhoneStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'phone' => ['required', 'integer']
        ];
    }

    public function toDto(): WorkerPhoneDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            throw ValidationException::withMessages([
                'worker' => trans('messages.worker.not_found'),
            ]);
        }

        return new WorkerPhoneDTO(
            workerId: $workerId,
            phone: $this->validated('phone')
        );
    }
}
