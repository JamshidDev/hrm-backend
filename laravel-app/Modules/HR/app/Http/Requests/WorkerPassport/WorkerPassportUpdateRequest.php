<?php

namespace Modules\HR\Http\Requests\WorkerPassport;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPassportDTO;

class WorkerPassportUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'serial_number' => ['required', 'string'],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'address' => ['required', 'string'],
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx,PDF', 'max:4096'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'serial_number' => str_replace(' ', '', $this->serial_number),
        ]);
    }

    public function toDto(int $workerId): WorkerPassportDTO
    {
        return new WorkerPassportDTO(
            workerId: $workerId,
            serialNumber: $this->validated('serial_number'),
            fromDate: $this->validated('from_date'),
            toDate: $this->validated('to_date'),
            address: $this->validated('address'),
            file: $this->file('file')
        );
    }
}
