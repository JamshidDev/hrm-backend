<?php

namespace App\Services\Mobile;

use App\Helpers\Helper;
use App\Models\User;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Services\WorkerPositionService;
use Modules\LMS\Transformers\ExamResource;

class UserInfoService
{
    private const array WORKER_RELATIONS = [
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
        'positions.organization:id,name,name_en,name_ru,full_name,group',
        'positions.department:id,name,level',
        'positions.position:id,name',
        'positions.contract',
        'incentives',
        'disciplinaryActions',
        'exams.exam.topic',
    ];

    public function __construct(private readonly WorkerPositionService $workerPositionService)
    {
    }

    public function buildWorkInfo(User $user): array
    {
        $worker = $user->worker;
        $worker->load(self::WORKER_RELATIONS);

        return [
            'personal_information' => $this->personalInformation($worker),
            'careers' => $this->careers($worker),
            'passport_information' => ['passports' => $this->passports($worker)],
            'educations' => $this->educations($worker),
            'relatives' => $this->relatives($worker),
            'meds' => $this->meds($worker),
            'vacations' => $this->vacations($worker),
            'incentives' => $this->incentives($worker),
            'disciplinary_actions' => $this->disciplinaryActions($worker),
            'exams' => $this->exams($worker),
        ];
    }

    private function personalInformation($worker): array
    {
        return [
            'last_name' => $worker->last_name,
            'first_name' => $worker->first_name,
            'middle_name' => $worker->middle_name,
            'birthday' => $worker->birthday,
            'photo' => Helper::fileUrl($worker->photo),
            'pin' => $worker->pin,
            'nationality' => $worker->nationality?->name,
            'current_region' => $worker->current_region?->name,
            'current_city' => $worker->current_city?->name,
            'current_address' => $worker->address,
            'birthday_city' => $worker->city?->name,
            'birthday_region' => $worker->region?->name,
            'birthday_country' => $worker->country?->name,
            'phones' => $worker->phones->pluck('phone')->toArray(),
            'languages' => $worker->languages->pluck('name')->toArray(),
            'marital_status' => MaritalStatusEnum::get($worker->marital_status),
        ];
    }

    private function careers($worker): array
    {
        return [
            'new_careers' => $this->workerPositionService->positions($worker->positions),
            'old_careers' => $worker->old_careers
                ->sortByDesc('sort')
                ->map(fn($career) => [
                    'from_date' => $career->from_date,
                    'to_date' => $career->to_date,
                    'post_name' => $career->post_name,
                ])
                ->values()
                ->toArray(),
        ];
    }

    private function passports($worker)
    {
        return $worker->passports
            ->sortByDesc('created_at')
            ->map(fn($passport) => [
                'serial_number' => $passport->serial_number,
                'from_date' => $passport->from_date,
                'to_date' => $passport->to_date,
                'address' => $passport->address,
                'file' => Helper::fileUrl($passport->file),
            ]);
    }

    private function educations($worker)
    {
        return $worker->universities->map(fn($u) => [
            'speciality' => $u->speciality?->name,
            'university' => $u->university?->name,
            'from_date' => $u->from_date,
            'to_date' => $u->to_date,
            'file' => Helper::fileUrl($u->file),
        ]);
    }

    private function relatives($worker)
    {
        return $worker->relatives->map(fn($r) => [
            'relative' => RelativeEnum::get($r->relative),
            'birthday' => $r->birthday,
            'last_name' => $r->last_name,
            'first_name' => $r->first_name,
            'middle_name' => $r->middle_name,
            'birth_place' => $r->birth_place,
            'post_name' => $r->post_name,
            'address' => $r->address,
        ]);
    }

    private function meds($worker)
    {
        return $worker->meds->map(fn($med) => [
            'from' => $med->from,
            'to' => $med->to,
            'status' => MedStatusEnum::get($med->status),
        ]);
    }

    private function vacations($worker)
    {
        return $worker->vacations->map(fn($v) => [
            'type' => VacationTypeEnum::get($v->type, app()->getLocale()),
            'from' => $v->from,
            'to' => $v->to,
            'work_day' => $v->work_day,
            'rest_day' => $v->rest_day,
            'all_day' => $v->all_day,
        ]);
    }

    private function incentives($worker)
    {
        return $worker->incentives->map(fn($i) => [
            'organization' => $i->organization?->name,
            'number' => $i->number,
            'reason' => $i->reason,
            'by_whom' => $i->by_whom,
            'gift' => $i->gift,
            'date' => $i->date,
        ]);
    }

    private function disciplinaryActions($worker)
    {
        return $worker->disciplinaryActions->map(fn($d) => [
            'organization' => $d->organization?->name,
            'number' => $d->number,
            'reason' => $d->reason,
            'fine' => $d->fine,
            'date' => $d->date,
        ]);
    }

    private function exams($worker)
    {
        return $worker->exams->map(fn($e) => [
            'exam_name' => $e->exam?->name,
            'created' => $e->created,
            'ended' => $e->ended,
            'result' => $e->result,
            'exam' => $e?->exam ? new ExamResource($e->exam) : null,
        ]);
    }
}
