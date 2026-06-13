<?php

namespace Modules\Integration\Services;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Http\Resources\PaginateResource;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Modules\Economist\Http\Controllers\StatementController;
use Modules\Economist\Models\Statement;
use Modules\Economist\Services\StatementService;
use Modules\HR\Enums\AcademicDegreeEnum;
use Modules\HR\Enums\AcademicTitleEnum;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Integration\Exceptions\IntegrationServiceException;
use Modules\Integration\Transformers\Position\WorkerPositionResource;

class IntegrationWorkerService
{
    public function __construct(
        public IntegrationService $service,
        public StatementService  $statementService,
    )
    {
    }

    public function checkWorker($data): JsonResponse
    {
        $worker = Worker::query()
            ->where('pin', $data['pin'])
            ->with([
                'photos',
                'phones',
                'current_city',
                'current_region',
                'region',
                'city',
                'country',
                'languages',
                'profile',
                'passports',
                'nationality',
                'old_careers',
                'academic_degrees',
                'academic_titles',
                'universities.speciality',
                'universities.university',
                'meds',
                'vacations',
                'positions.organization:id,name,name_en,name_ru,group,full_name',
                'positions.department:id,name,level',
                'positions.position:id,name',
                'positions.contract',
                'exams',
                'meds',
                'vacations',
            ])
            ->first();

        if (!$worker) {
            return response()->json();
        }

        $data = $this->workerData($worker);
        return response()->json([
            'worker' => $data,
        ]);
    }

    public function workerData($worker): array
    {
        return [
            'uuid' => $worker->uuid,
            'last_name' => $worker->last_name,
            'first_name' => $worker->first_name,
            'middle_name' => $worker->middle_name,
            'birthday' => $worker->birthday,
            'pin' => $worker->pin,
            'sex' => $worker->sex ? 'male' : 'female',
            'education' => EducationEnum::get($worker->education),
            'address' => $worker->address,
            'photos' => $worker->photos->map(fn($photo) => [
                'photo' => Helper::fileUrl($photo->photo),
                'current' => $photo->current,
            ]),
            'phones' => $worker->phones->map(fn($phone) => $phone->phone),
            'languages' => $worker->languages->map(fn($language) => $language->name),
            'passports' => $worker->passports->map(fn($passport) => [
                'serial_number' => $passport->serial_number,
                'from_date' => $passport->from_date,
                'to_date' => $passport->to_date,
                'address' => $passport->address
            ]),
            'marital_status' => MaritalStatusEnum::get($worker->marital_status),
            'nationality' => $worker->nationality->name,
            'region' => $worker->region->name,
            'city' => $worker->city->name,
            'country' => $worker->country->name,
            'current_region' => $worker->current_region->name,
            'current_city' => $worker->current_city->name,
            'profile_phone' => $worker->profile?->phone,
            'positions' => $worker->positions->map(fn($position) => [
                'organization' => $position->organization->name,
                'department' => $position->department->name,
                'position' => $position->position->name,
                'full_position' => PositionHelper::getFullPosition($position),
                'from' => $position->position_date
            ]),
            'relatives' => $worker->relatives->map(fn($relative) => [
                'relative' => RelativeEnum::get($relative->relative),
                'birthday' => $relative->birthday,
                'last_name' => $relative->last_name,
                'first_name' => $relative->first_name,
                'middle_name' => $relative->middle_name,
                'birth_place' => $relative->birth_place,
                'post_name' => $relative->post_name,
                'address' => $relative->address
            ]),
            'universities' => $worker->universities->map(fn($university) => [
                'speciality' => $university->speciality?->name,
                'university' => $university->university?->name,
                'from_date' => $university->from_date,
                'to_date' => $university->to_date,
                'file' => Helper::fileUrl($university->file),
            ]),
            'old_careers' => $worker->old_careers?->sortByDesc('sort')->map(fn($old_career) => [
                'from_date' => $old_career->from_date,
                'to_date' => $old_career->to_date,
                'post_name' => $old_career->post_name
            ]),
            'academic_degrees' => $worker->academic_degrees?->map(fn($academic_degree) => [
                'type' => AcademicDegreeEnum::get($academic_degree->type),
                'file' => Helper::fileUrl($academic_degree->file)
            ]),
            'academic_titles' => $worker->academic_titles?->map(fn($academic_title) => [
                'type' => AcademicTitleEnum::get($academic_title->type),
                'file' => Helper::fileUrl($academic_title->file)
            ]),
            'exams' => $worker->exams->map(fn($exam) => [
                'exam' => $exam->exam?->name,
                'created' => $exam->created,
                'ended' => $exam->ended,
                'result' => $exam->result,
            ]),
            'meds' => $worker->meds->map(fn($med) => [
                'status' => [
                    'id' => $med->status,
                    'name' => MedStatusEnum::get($med->status)
                ],
                'from' => $med->from,
                'to' => $med->to,
                'current' => $med->current,
            ]),
            'vacations' => $worker->vacations->map(fn($vacation) => [
                'from' => $vacation->from,
                'to' => $vacation->to,
                'type' => VacationTypeEnum::get($vacation->type, app()->getLocale()),
                'work_day' => $vacation->work_day,
                'rest_day' => $vacation->rest_day,
                'all_day' => $vacation->all_day,
                'main_day' => $vacation->main_day,
                'second_day' => $vacation->second_day,
            ])
        ];
    }

    public function getStatements($data): JsonResponse
    {
        $worker = Worker::query()->whereUuid($data['uuid'])->first();
        if (!$worker) {
            return response()->json();
        }
        $statements = Statement::query()
            ->wherePin($worker->pin)
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->get();
        $amounts = [];
        $this->statementService->getStatements($statements, $amounts);
        return response()->json([
            'salary' => $amounts
        ]);
    }

    public function getStatementMonths($data): JsonResponse
    {
        $worker = Worker::query()->whereUuid($data['uuid'])->first();
        if (!$worker) {
            return response()->json();
        }
        $salaryMonths = Cache::remember(
            "salary_months_{$worker->id}",
            now()->addHours(2),
            static fn() => Statement::query()
                ->where('worker_id', $worker->id)
                ->orWhere('pin', $worker->pin)
                ->select('year', 'month')
                ->groupBy('year', 'month')
                ->get()
        );

        return response()->json([
            'months' => $salaryMonths
        ]);
    }

    public function workers($data, $user): JsonResponse
    {
        try {
            $wp = WorkerPosition::query()
                ->filter($user, $data)
                ->whereHas('worker', function ($query) use ($data) {
                    $query->whereIn('pin', $data['pins']);
                })
                ->when(request('search'), function ($query) {
                    $query->whereHas('worker', function ($query) {
                        $query->searchByFullName();
                    });
                })
                ->with([
                    'department:id,name,level',
                    'organization:id,name,group,name_ru,name_en,full_name',
                    'department_position.position:id,name',
                    'worker:id,uuid,last_name,first_name,middle_name,photo,birthday,pin,country_id,region_id,city_id,sex,card',
                    'worker.phones',
                    'worker.country:id,name',
                    'worker.region:id,name',
                    'worker.city:id,name',
                    'worker.med',
                    'contract:id,type'
                ])
                ->paginate($data['per_page'] ?? 10);

            $data = PaginateResource::make($wp, WorkerPositionResource::class);
            return Helper::response(true, $data);
        } catch (Exception $e) {
            Helper::setLog($e, 'Integration Workers Error');
            throw IntegrationServiceException::serverError(trans('messages.server_error'));
        }
    }
}
