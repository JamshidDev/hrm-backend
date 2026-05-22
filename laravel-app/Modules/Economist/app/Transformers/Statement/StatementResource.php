<?php

namespace Modules\Economist\Transformers\Statement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class StatementResource extends JsonResource
{
    public function toArray(Request $request): array
    {

        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'worker' => new WorkerMinimalResource($this->worker),
            'full_name' => $this->full_name,
            'pin' => $this->pin,
            'worker_id' => $this->worker_id,
            'position' => $this->position,
            'work_time' => $this->work_time,
            'main_salary' => number_format($this->main_salary, 2, '.', ' '),
            'year' => $this->year,
            'month' => $this->month,
            'total_one' => number_format($this->total_one, 2, '.', ' '),
            'total_two' => number_format($this->total_two, 2, '.', ' '),
            'total_three' => number_format($this->total_three, 2, '.', ' '),
            'total_four' => number_format($this->total_four, 2, '.', ' '),
            'total_five' => number_format($this->total_five, 2, '.', ' '),
            'diff' => $this->total_four === $this->total_five
        ];
    }


}
