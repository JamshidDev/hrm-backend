<?php

namespace Modules\HR\Http\Requests\Med;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\MedDTO;
use Modules\HR\Models\WorkerPosition;

class MedStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['required'],
            'comment' => ['nullable', 'string'],
            'worker_position_id' => ['required', 'exists:worker_positions,id'],
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf', 'max:10240'],
        ];
    }

    public function toDto(): MedDTO
    {
        $workerId = WorkerPosition::findOrFail(
            $this->validated('worker_position_id')
        )->worker_id;

        $user = $this->user();

        return new MedDTO(
            workerId: $workerId,
            from: $this->validated('from'),
            to: $this->validated('to'),
            status: (bool) $this->validated('status'),
            comment: $this->validated('comment'),
            file: $this->file('file'),
            userId: $user->id,
            organizationId: $user->organization_id,
        );
    }
}
