<?php

namespace Modules\HR\Http\Requests\WorkerOldCareer;

use App\Helpers\Helper;
use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerOldCareerDTO;

class WorkerOldCareerStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['required', 'uuid'],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date'],
            'post_name' => ['required', 'string']
        ];
    }

    public function toDto(): WorkerOldCareerDTO
    {
        $workerId = Helper::idUuid($this->validated('uuid'));

        if (!$workerId) {
            abort(400, trans('messages.worker.not_found'));
        }

        return new WorkerOldCareerDTO(
            workerId: $workerId,
            fromDate: $this->validated('from_date'),
            toDate: $this->validated('to_date'),
            postName: $this->validated('post_name'),
            sort: $this->validated('sort') ?? 0,
        );
    }
}
