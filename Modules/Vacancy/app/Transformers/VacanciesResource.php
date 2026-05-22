<?php

namespace Modules\Vacancy\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\WorkTypeEnum;
use Modules\Structure\Transformers\Structure\CityResource;

class VacanciesResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        $departmentPosition = $this->department_position;

        return [
            'id' => $this->id,
            'organization' => $this->organization->full_name,
            'position' => ucfirst($departmentPosition?->position?->name),
            'department' => ucfirst($departmentPosition?->department?->name),
            'salary' => $this->salary,
            'salary_status' => $this->salary_status,
            'phd_status' => $this->phd_status,
            'work_type' => [
                'id' => $this->work_type,
                'name' => WorkTypeEnum::get($this->work_type)
            ],
            'city' => new CityResource($this->city),
            'experience' => $this->experience,
            'address' => $this->address,
            'education' => [
                'id' => $this->education,
                'name' => EducationEnum::get($this->education)
            ],
            'created_at' => $this->created_at->format('Y-m-d'),
            'to' => $this->to,
            'view_count' => $this->view_count,
            'applications_count' => $this->applications_count ?? 0
        ];
    }
}
