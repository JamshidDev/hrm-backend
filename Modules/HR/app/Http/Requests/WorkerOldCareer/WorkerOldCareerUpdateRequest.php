<?php

namespace Modules\HR\Http\Requests\WorkerOldCareer;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\WorkerOldCareerDTO;

class WorkerOldCareerUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date'],
            'post_name' => ['required', 'string']
        ];
    }


    public function authorize(): bool
    {
        return true;
    }

    public function toDto(int $workerId): WorkerOldCareerDTO
    {
        return new WorkerOldCareerDTO(
            workerId: $workerId,
            fromDate: $this->validated('from_date'),
            toDate: $this->validated('to_date'),
            postName: $this->validated('post_name'),
            sort: $this->validated('sort') ?? 0,
        );
    }
}
