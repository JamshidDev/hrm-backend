<?php

namespace Modules\HR\Http\Requests\WorkerPassport;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerPassportDTO;

class WorkerPassportStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'exists:workers,id'],
            'serial_number' => ['required', 'string'],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'address' => ['required', 'string'],
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx,PDF', 'max:4096'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'serial_number' => str_replace(' ', '', $this->serial_number),
        ]);
    }

    public function toDto(): WorkerPassportDTO
    {
        return new WorkerPassportDTO(
            workerId: $this->validated('worker_id'),
            serialNumber: $this->validated('serial_number'),
            fromDate: $this->validated('from_date'),
            toDate: $this->validated('to_date'),
            address: $this->validated('address'),
            file: $this->file('file')
        );
    }
}
