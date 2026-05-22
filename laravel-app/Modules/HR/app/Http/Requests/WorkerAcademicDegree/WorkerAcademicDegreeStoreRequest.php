<?php

namespace Modules\HR\Http\Requests\WorkerAcademicDegree;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerAcademicDegreeDTO;

class WorkerAcademicDegreeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'type' => ['required'],
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx', 'max:4096'],
        ];
    }

    public function toDto(): WorkerAcademicDegreeDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerAcademicDegreeDTO(
            workerId: $workerId,
            type: $this->validated('type'),
            file: $this->file('file')
        );
    }
}
