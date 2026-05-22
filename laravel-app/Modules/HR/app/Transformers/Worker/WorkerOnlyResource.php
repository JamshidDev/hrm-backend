<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\PositionHelper;
use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Economist\Services\Support\StatementDetailService;
use Modules\Exam\Transformers\ExamResultResource;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\DisciplinaryAction\WorkerDisciplinaryResource;
use Modules\HR\Transformers\Incentives\WorkerIncentiveResource;
use Modules\HR\Transformers\Nationality\NationalityResource;
use Modules\HR\Transformers\Worker\OldCareer\WorkerOldCareerResource;
use Modules\HR\Transformers\Worker\Relative\WorkerRelativeResource;
use Modules\HR\Transformers\Worker\University\WorkerUniversityResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\OnlyCountryResource;
use Modules\Structure\Transformers\Structure\OnlyRegionResource;

class WorkerOnlyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'photos' => WorkerPhotosResource::collection($this->photos),
            'phones' => WorkerPhonesResource::collection($this->phones),
            'languages' => WorkerLanguagesResource::collection($this->languages),
            'passports' => WorkerPassportResource::collection($this->passports),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'pin' => $this->pin,
            'sex' => $this->sex,
            'education' => $this->education,
            'address' => $this->address,
            'marital_status' => [
                'id' => $this->marital_status,
                'name' => MaritalStatusEnum::get($this->marital_status)
            ],
            'nationality' => new NationalityResource($this->nationality),
            'region' => new OnlyRegionResource($this->region),
            'city' => new OnlyCityResource($this->city),
            'country' => new OnlyCountryResource($this->country),
            'current_region' => new OnlyRegionResource($this->current_region),
            'current_city' => new OnlyCityResource($this->current_city),
            'profile' => new UserInfoResource($this->profile),
            'relatives' => WorkerRelativeResource::collection($this->relatives),
            'universities' => WorkerUniversityResource::collection($this->universities),
            'old_careers' => WorkerOldCareerResource::collection($this->old_careers->sortByDesc('sort')),
            'academic_degrees' => WorkerAcademicDegreeResource::collection($this->academic_degrees),
            'academic_titles' => WorkerAcademicTitleResource::collection($this->academic_titles),
            'new_careers' => $this->newCareersArr($this->all_positions),
            'incentives' => WorkerIncentiveResource::collection($this->incentives),
            'disciplinary_actions' => WorkerDisciplinaryResource::collection($this->disciplinaryActions),
            'exams' => ExamResultResource::collection($this->exams),
            'statements' => app(StatementDetailService::class)->buildDetails($this->whenLoaded('statementsByPin')),
        ];
    }

    public function newCareersArr($positions): array
    {
        if (!$positions) {
            return [];
        }
        $a = [];
        foreach ($positions->sortBy('position_date') as $position) {
            if ($position->to) {
                $to = $position->to;
            } else {
                $nextPosition = $positions->where('id', '>', $position->id)->first();
                if ($nextPosition) {
                    if ($nextPosition->contract_id === $position->contract_id) {
                        $to = $nextPosition->position_date;
                    } else {
                        $to = $position->contract?->contract_to_date;
                    }
                } else {
                    $to = null;
                }
            }

            $a[] = [
                'id' => $position?->id,
                'organization' => $position->organization ? new OrganizationListResource($position->organization) : null,
                'department' => $position->department ? new DepartmentListResource($position->department) : null,
                'position' => $position->position ? new PositionMinimalResource($position->position) : null,
                'full_position' => $position ? PositionHelper::getFullPosition($position) : null,
                'from' => $position?->position_date,
                'to' => $to
            ];
        }
        return $a;
    }
}
