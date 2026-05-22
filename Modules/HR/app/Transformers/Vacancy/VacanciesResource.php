<?php

namespace Modules\HR\Transformers\Vacancy;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Enums\WorkTypeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Modules\Structure\Transformers\Structure\CityResource;

class VacanciesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $position = $this->department_position;
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'position' => new PositionMinimalResource($position->position),
            'department' => new DepartmentListResource($position->department),
            'rate' => $this->rate,
            'to' => $this->to,
            'finish' => $this->finish,
            'city' => new CityResource($this->city),
            'salary' => $this->salary,
            'salary_status' => $this->salary_status,
            'phd_status' => $this->phd_status,
            'experience' => $this->experience,
            'vacancy_status' => [
                'id' => $this->vacancy_status,
                'name' => VacancyLevelEnum::get($this->vacancy_status)
            ],
            'work_type' => [
                'id' => $this->work_type,
                'name' => WorkTypeEnum::get($this->work_type)
            ],
            'education' => [
                'id' => $this->education,
                'name' => EducationEnum::get($this->education)
            ],
            'applications_count' => $this->applications_count,
            'status' => $this->status
        ];
    }
}
