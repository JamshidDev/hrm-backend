<?php

namespace Modules\HR\Http\Requests\Med;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\MedDTO;
use Modules\HR\Models\Med;

class MedUpdateRequest extends FormRequest
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
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf', 'max:10240'],
        ];
    }

    public function toDto(Med $med): MedDTO
    {
        $user = $this->user();

        return new MedDTO(
            workerId: $med->worker_id,
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
