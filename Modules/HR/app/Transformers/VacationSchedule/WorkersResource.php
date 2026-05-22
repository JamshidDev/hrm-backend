<?php

namespace Modules\HR\Transformers\VacationSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $schedule = $this->vacationSchedule->first();
        if ($schedule) {
            $schedule = [
                'id' => $schedule->id,
                'period_from' => $schedule->period_from,
                'period_to' => $schedule->period_to,
                'all_days' => $schedule->all_days,
                'plan_date' => $schedule->plan_date,
                'real_date' => $schedule->real_date,
                'table_number' => $schedule->table_number,
                'status' => [
                    'id' => $schedule->status,
                    'name' => ConfirmationStatusEnum::tryFrom($schedule->status)?->label()
                ],
                'confirmation_type' => [
                    'id' => $schedule->confirmation_type,
                    'name' => ConfirmationTypeEnum::tryFrom($schedule->confirmation_type)?->label()
                ]
            ];
        }

        if ($this->lastVacation) {
            $vacation = [
                'period_from' => $this->lastVacation->period_from,
                'period_to' => $this->lastVacation->period_to,
            ];
        }
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionMinimalResource($this->position),
            'table_number' => $this->contract?->table_number,
            'vacation_schedule' => $schedule,
            'lastVacation' => $vacation ?? null,
            'all_days' => 24
        ];
    }
}
