<?php

namespace Modules\HR\Http\Requests\WorkerUniversity;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerUniversityDTO;

class WorkerUniversityStoreRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid'           => ['required', 'uuid'],
            'university_id'  => ['required', 'exists:universities,id'],
            'speciality_id'  => ['required', 'exists:specialities,id'],
            'from_date'      => ['required', 'date'],
            'to_date'        => ['required', 'date', 'after_or_equal:from_date'],
            'file'           => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx', 'max:4096'],
        ];
    }

    public function toDto(): WorkerUniversityDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerUniversityDTO(
            workerId: $workerId,
            universityId: $this->validated('university_id'),
            specialityId: $this->validated('speciality_id'),
            fromDate: $this->validated('from_date'),
            toDate: $this->validated('to_date'),
            file: $this->file('file')
        );
    }
}
