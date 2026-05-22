<?php

namespace Modules\HR\Transformers\VacationSchedule;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\ConfirmationWorker\ConfirmationMinimalResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class VacationScheduleYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'year' => $this->year,
            'number' => $this->number,
            'date' => $this->date,
            'director' => new ConfirmationMinimalResource($this->director),
            'tradeUnion' => new ConfirmationMinimalResource($this->tradeUnion),
            'creator' => new WorkerPositionMinResource($this->creator),
            'file' => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'generate' => $this->generate,
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label(),
            ]
        ];
    }
}
