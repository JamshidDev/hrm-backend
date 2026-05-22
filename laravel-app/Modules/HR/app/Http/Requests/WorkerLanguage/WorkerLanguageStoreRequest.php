<?php

namespace Modules\HR\Http\Requests\WorkerLanguage;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerLanguageDTO;

class WorkerLanguageStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'language_id' => ['required', 'exists:languages,id'],
            'file' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,docx', 'max:4096'],
        ];
    }

    public function toDto(): WorkerLanguageDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerLanguageDTO(
            workerId: $workerId,
            languageId: $this->validated('language_id'),
            file: $this->file('file')
        );
    }
}
