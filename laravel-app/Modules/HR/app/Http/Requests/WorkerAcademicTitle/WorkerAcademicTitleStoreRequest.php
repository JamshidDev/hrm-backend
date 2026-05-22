<?php

namespace Modules\HR\Http\Requests\WorkerAcademicTitle;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerAcademicTitleDTO;

class WorkerAcademicTitleStoreRequest extends FormRequest
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

    public function toDto(): WorkerAcademicTitleDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerAcademicTitleDTO(
            workerId: $workerId,
            type: $this->validated('type'),
            file: $this->file('file')
        );
    }
}
