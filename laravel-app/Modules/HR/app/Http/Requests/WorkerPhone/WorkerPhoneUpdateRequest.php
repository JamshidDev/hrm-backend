<?php

namespace Modules\HR\Http\Requests\WorkerPhone;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPhoneDTO;

class WorkerPhoneUpdateRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'phone'     => ['required', 'integer']
        ];
    }


    public function authorize(): bool
    {
        return true;
    }

    public function toDto(int $workerId): WorkerPhoneDTO
    {
        return new WorkerPhoneDTO(
            workerId: $workerId,
            phone: $this->validated('phone')
        );
    }
}
