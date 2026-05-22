<?php

namespace Modules\Turnstile\Transformers\Preview;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RepeatedAbsentWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $workDayCount = (int)$this->work_day_count;
        $absentDayCount = (int)$this->absent_day_count;

        return array(
            'worker_position_id' => $this->worker_position_id,
            'worker_id' => $this->worker_id,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'photo' => Helper::fileUrl($this->photo),
            'organization_name' => $this->organization_name,
            'department_name' => $this->department_name,
            'position_name' => $this->position_name,
            'work_day_count' => $workDayCount,
            'absent_day_count' => $absentDayCount,
            'attendance_day_count' => max($workDayCount - $absentDayCount, 0),
        );
    }
}
