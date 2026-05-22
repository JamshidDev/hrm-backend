<?php

namespace Modules\HR\Http\Requests\WorkerRelative;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerRelativeDTO;
use Modules\HR\Models\Worker;

class WorkerRelativeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'worker_id' => ['nullable', 'exists:workers,id'],
            'sort' => ['nullable', 'integer'],
            'relative' => ['integer'],
            'last_name' => ['nullable', 'string'],
            'first_name' => ['nullable', 'string'],
            'middle_name' => ['nullable', 'string'],
            'birthday' => ['nullable', 'date'],
            'birth_place' => ['nullable', 'string'],
            'post_name' => ['nullable', 'string'],
            'address' => ['nullable', 'string']
        ];
    }

    public function toDto(): WorkerRelativeDTO
    {
        $worker = Worker::where('uuid', $this->validated('uuid'))->first();

        if (!$worker) {
            abort(400, trans('messages.worker.not_found'));
        }

        $relative = null;

        if ($this->validated('worker_id')) {
            $relative = Worker::with([
                'positions',
                'current_region',
                'current_city',
                'region',
                'city',
            ])->find($this->validated('worker_id'));
        }

        return new WorkerRelativeDTO(
            workerId: $worker->id,
            relativeWorkerId: $relative?->id,
            pin: $relative?->pin,
            relative: $this->validated('relative'),
            lastName: $relative->last_name ?? $this->validated('last_name'),
            firstName: $relative?->first_name ?? $this->validated('first_name'),
            middleName: $relative?->middle_name ?? $this->validated('middle_name'),
            birthday: $relative?->birthday ?? $this->validated('birthday'),
            birthPlace: $relative?->fullBirthdayAddress() ?? $this->validated('birth_place'),
            postName: $relative?->implodePositions() ?? $this->validated('post_name'),
            address: $relative?->fullCurrentAddress() ?? $this->validated('address'),
            sort: $this->validated('sort') ?? 0,
            marital_status: $relative?->marital_status ?? $this->validated('marital_status')
        );
    }
}
