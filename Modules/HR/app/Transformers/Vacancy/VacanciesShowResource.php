<?php

namespace Modules\HR\Transformers\Vacancy;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\VacancyChangeStatusEnum;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Enums\WorkTypeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Modules\Structure\Transformers\Structure\CityResource;

class VacanciesShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $position = $this->department_position;

        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'position' => new PositionMinimalResource($position->position),
            'department' => new DepartmentListResource($position->department),
            'department_position_id' => $position->id,
            'rate' => $this->rate,
            'to' => $this->to,
            'finish' => $this->finish,
            'city' => new CityResource($this->city),
            'salary' => $this->salary,
            'salary_status' => $this->salary_status,
            'phd_status' => $this->phd_status,
            'experience' => $this->experience,
            'work_type' => [
                'id' => $this->work_type,
                'name' => WorkTypeEnum::get($this->work_type)
            ],
            'education' => [
                'id' => $this->education,
                'name' => EducationEnum::get($this->education)
            ],
            'address' => $this->address,
            'position_obligations' => $this->position_obligations,
            'qualification_requirements' => $this->qualification_requirements,
            'working_conditions' => $this->working_conditions,
            'specialties' => $this->specialties,
            'status' => $this->status,
            'vacancy_status' => [
                'id' => $this->vacancy_status,
                'name' => VacancyLevelEnum::get($this->vacancy_status)
            ],
            'applications' => VacancyApplicationsResource::collection($this->applications)
        ];
    }


}
