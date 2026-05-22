<?php

namespace Modules\HR\Http\Controllers\Dashboard;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\OrganizationDisciplinary;
use Modules\HR\Models\OrganizationIncentive;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerDisability;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Models\WorkerRelativeDisability;
use Modules\HR\Models\WorkerSickLeave;
use Modules\HR\Transformers\Dashboard\BirthdaysResource;
use Modules\HR\Transformers\Dashboard\ContractViewResource;
use Modules\HR\Transformers\Dashboard\WorkerDisabilityPreviewResource;
use Modules\HR\Transformers\Dashboard\WorkerMedResource;
use Modules\HR\Transformers\Dashboard\WorkerPassportResource;
use Modules\HR\Transformers\Dashboard\WorkerRelativeDisabilityPreviewResource;
use Modules\HR\Transformers\Dashboard\WorkerSickLeavePreviewResource;
use Modules\HR\Transformers\Dashboard\WorkersByEducationResource;
use Modules\HR\Transformers\DisciplinaryAction\DisciplinaryResource;
use Modules\HR\Transformers\Incentives\IncentiveResource;

class DashboardViewController extends Controller
{
    public function birthdays(): JsonResponse
    {
        $user = auth()->user();

        $workers = WorkerPosition::query()
            ->search()->filter($user, request()->all())->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
            ])->whereHas('worker', function ($query) {
                $query->where('birth_day', request('birth_day'))
                    ->where('birth_month', request('birth_month'));
            })->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, BirthdaysResource::class);

        return Helper::response(true, $data);
    }

    public function workersByEducation(): JsonResponse
    {
        $user = auth()->user();

        $workers = WorkerPosition::query()
            ->search()->filter($user, request()->all())->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
                'worker.universities:id,worker_id,university_id,speciality_id,from_date,to_date',
                'worker.universities.speciality:id,name,name_ru,name_en',
                'worker.universities.university:id,name,name_ru,name_en,education',
                'worker.educations:id,education',
            ])->when(request('type'), function ($query, $type) {
                $query->whereHas('worker', function ($query) use ($type) {
                    $query->where('education', $type);
                });
            })->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, WorkersByEducationResource::class);

        return Helper::response(true, $data);
    }

    public function workerByAge(): JsonResponse
    {
        $user = auth()->user();

        $ageStart = request('age_start');
        $ageEnd = request('age_end');

        if ($ageStart && $ageEnd && $ageStart > $ageEnd) {
            [$ageStart, $ageEnd] = [$ageEnd, $ageStart];
        }

        $workers = WorkerPosition::query()
            ->search()
            ->filter($user, request()->all())
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
            ])
            ->whereHas('worker', function ($query) use ($ageStart, $ageEnd) {
                $query
                    ->when($ageStart, fn($q) => $q->where('birthday', '<=', now()->subYears($ageStart))
                    )
                    ->when($ageEnd, fn($q) => $q->where('birthday', '>=', now()->subYears($ageEnd))
                    )
                    ->when(request()->has('sex'), fn($q) => $q->where('sex', (int)request('sex') === 1)
                    );
            })
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, BirthdaysResource::class);

        return Helper::response(true, $data);
    }

    public function workerByPassport(): JsonResponse
    {
        $user = auth()->user();

        $workers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->search()
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
                'worker.passport:id,worker_id,serial_number,from_date,to_date',
            ])
            ->whereHas('worker', function ($query) {
                if (request('filter') === 'not_included') {
                    return $query->doesntHave('passport');
                }
                if (request('filter') === 'expired') {
                    $now = now();
                } else {
                    $now = now()->addMonth(1);
                }
                return $query->whereHas('passport', function ($query) use ($now) {
                    $query->where('to_date', '<=', $now);
                });
            })->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, WorkerPassportResource::class);

        return Helper::response(true, $data);
    }

    public function workerByPension(): JsonResponse
    {
        $user = auth()->user();

        $workers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->search()
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
            ])->whereHas('worker', function ($q) {
                $maleAge = now()->subYears(60);
                $femaleAge = now()->subYears(55);

                if (request()->has('sex')) {
                    $sex = (int)request('sex');

                    $q->where('sex', $sex)
                        ->where('birthday', '<=', $sex === 1 ? $maleAge : $femaleAge);
                } else {
                    $q->where(function ($q) use ($maleAge, $femaleAge) {
                        $q->where(function ($q) use ($maleAge) {
                            $q->where('sex', 1)
                                ->where('birthday', '<=', $maleAge);
                        })->orWhere(function ($q) use ($femaleAge) {
                            $q->where('sex', 0)
                                ->where('birthday', '<=', $femaleAge);
                        });
                    });
                }
            })->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, BirthdaysResource::class);

        return Helper::response(true, $data);
    }

    public function workerByMed(): JsonResponse
    {
        $user = auth()->user();
        $currentDate = now();
        $nextMonth = now()->copy()->addMonth();

        $latestMeds = DB::table('meds as m1')
            ->select('m1.worker_id', 'm1.to')
            ->whereRaw('m1.to = (
                SELECT MAX(m2.to)
                FROM meds m2
                WHERE m2.worker_id = m1.worker_id
            )');

        $stats = Worker::query()
            ->select('workers.id', 'workers.last_name', 'workers.first_name', 'workers.middle_name', 'workers.birthday', 'workers.photo', 'latest_meds.to')
            ->whereHas('positions', fn($query) => $query->filter($user, request()->all()))
            ->leftJoinSub($latestMeds, 'latest_meds', fn($join) => $join->on('latest_meds.worker_id', '=', 'workers.id')
            )
            ->when(request('type') === 'finished', function ($query) use ($currentDate) {
                $query->where('latest_meds.to', '<=', $currentDate);
            }, function ($query) use ($currentDate, $nextMonth) {
                $query->where('latest_meds.to', '>', $currentDate)
                    ->where('latest_meds.to', '<', $nextMonth);
            })
            ->with([
                'positions:id,position_id,worker_id,organization_id,department_id',
                'positions.position:id,name',
                'positions.department:id,name,level',
                'positions.organization:id,name,full_name',
            ])
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($stats, WorkerMedResource::class);
        return Helper::response(true, $data);
    }

    public function workerDisabilitiesPreview(): JsonResponse
    {
        $user = auth()->user();

        $workerDisabilities = WorkerDisability::query()
            ->whereHas('worker.position', function ($query) use ($user) {
                $query->filter($user, request()->all())
                    ->when(request('search'), function ($query) {
                        $query->whereHas('worker', fn($query) => $query->searchByFullName());
                    });
            })
            ->when(request('level'), function ($query, $level) {
                $query->where('level', $level);
            })
            ->with([
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'worker.position:id,worker_id,organization_id,department_id,position_id,type',
                'worker.position.organization:id,name,name_en,name_ru,group',
                'worker.position.department:id,name,level',
                'worker.position.position:id,name,name_ru,name_en',
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workerDisabilities, WorkerDisabilityPreviewResource::class);
        return Helper::response(true, $data);
    }

    public function workerRelativeDisabilitiesPreview(): JsonResponse
    {
        $user = auth()->user();

        $workerRelativeDisabilities = WorkerRelativeDisability::query()
            ->whereHas('workerRelative.worker.positions', function ($query) use ($user) {
                $query->filter($user, request()->all())
                    ->when(request('search'), function ($query) {
                        $query->whereHas('worker', fn($query) => $query->searchByFullName());
                    });
            })
            ->when(request('level'), function ($query, $level) {
                $query->where('level', $level);
            })
            ->with([
                'workerRelative:id,worker_id,relative,last_name,first_name,middle_name,birthday',
                'workerRelative.worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'workerRelative.worker.position:id,worker_id,organization_id,department_id,position_id,type',
                'workerRelative.worker.position.organization:id,name,name_en,name_ru,group',
                'workerRelative.worker.position.department:id,name,level',
                'workerRelative.worker.position.position:id,name,name_ru,name_en',
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workerRelativeDisabilities, WorkerRelativeDisabilityPreviewResource::class);
        return Helper::response(true, $data);
    }

    public function workerSickLeavesPreview(): JsonResponse
    {
        $user = auth()->user();
        $currentDate = now()->format('Y-m-d');

        $workerSickLeaves = WorkerSickLeave::query()
            ->whereHas('workerPosition', function ($query) use ($user) {
                $query->filter($user, request()->all())
                    ->when(request('search'), function ($query) {
                        $query->whereHas('worker', fn($query) => $query->searchByFullName());
                    });
            })
            ->when(request('type'), function ($query, $type) {
                $query->where('type', $type);
            })
            ->when(request('status') === 'active', function ($query) use ($currentDate) {
                $query->where('from_date', '<=', $currentDate)
                    ->where(function ($query) use ($currentDate) {
                        $query->whereNull('to_date')
                            ->orWhere('to_date', '>=', $currentDate);
                    });
            })
            ->when(request('status') === 'finished', function ($query) use ($currentDate) {
                $query->where('to_date', '<', $currentDate);
            })
            ->with([
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'workerPosition:id,worker_id,organization_id,department_id,position_id,type',
                'workerPosition.organization:id,name,name_en,name_ru,group',
                'workerPosition.department:id,name,level',
                'workerPosition.position:id,name,name_ru,name_en',
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workerSickLeaves, WorkerSickLeavePreviewResource::class);
        return Helper::response(true, $data);
    }

    public function disciplinaryActions(): JsonResponse
    {
        $user = auth()->user();
        $disciplinaryActions = OrganizationDisciplinary::query()
            ->filter($user, request()->all())
            ->when(request('type'), function ($query, $type) {
                $query->where('fine_type', $type);
            })
            ->with([
                'worker_position:id,worker_id,organization_id,position_id,department_id',
                'worker_position.department:id,name,level',
                'worker_position.position:id,name',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
                'organization:id,name,name_en,name_ru,group,full_name',
            ])
            ->whereYear('date', request('year', now()->year))
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($disciplinaryActions, DisciplinaryResource::class);
        return Helper::response(true, $data);
    }

    public function incentiveActions(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $data = OrganizationIncentive::query()
            ->filter($user, request()->all())
            ->when(request('type'), function ($query, $type) {
                $query->where('gift_type', $type);
            })
            ->with([
                'worker_position:id,id,worker_id,organization_id,position_id,department_id,contract_id',
                'worker_position.department:id,name,level',
                'worker_position.position:id,name',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
                'worker_position.worker:id,id,last_name,first_name,middle_name,birthday,photo',
                'organization:id,name,name_en,name_ru,group'
            ])
            ->whereYear('date', request('year', now()->year))
            ->orderByDesc('id')->paginate($per_page);

        $data = PaginateResource::make($data, IncentiveResource::class);

        return Helper::response(true, $data);
    }

    public function workerByContractTypes(): JsonResponse
    {
        $user = auth()->user();

        $workers = WorkerPosition::query()
            ->search()
            ->filter($user, request()->all())
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
                'department:id,name,level',
                'position:id,name,name_ru,name_en',
            ])->when(request('type'), function ($query, $type) {
                $query->whereType($type);
            })
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, BirthdaysResource::class);

        return Helper::response(true, $data);
    }

    public function contracts(): JsonResponse
    {
        return match (request('type')) {
            'created' => $this->newContracts(),
            'ended' => $this->endedContracts(),
            default => Helper::response()
        };
    }

    public function newContracts(): JsonResponse
    {
        $year = request('year', now()->year);
        $month = request('month', now()->month);
        $date = Carbon::create($year, $month, 1);
        $from = $date->startOfMonth()->toDateString();
        $to = $date->endOfMonth()->toDateString();

        $user = auth()->user();
        $newContracts = Contract::query()
            ->filter($user, request()->all())
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->whereNotNull('worker_id')
            ->whereHas('contract_position')
            ->whereBetween('contract_date', [$from, $to])
            ->with([
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
            ])->paginate(request('per_page', 10));

        $data = PaginateResource::make($newContracts, ContractViewResource::class);
        return Helper::response(true, $data);
    }

    public function endedContracts(): JsonResponse
    {
        $year = request('year', now()->year);
        $month = request('month', now()->month);
        $date = Carbon::create($year, $month, 1);
        $from = $date->startOfMonth()->toDateString();
        $to = $date->endOfMonth()->toDateString();

        $user = auth()->user();
        $endedContracts = Contract::query()
            ->filter($user, request()->all())
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->where('status', PositionStatusEnum::FINISHED->value)
            ->whereNotNull('worker_id')
            ->whereBetween('contract_to_date', [$from, $to])
            ->with([
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
            ])->paginate(request('per_page', 10));

        $data = PaginateResource::make($endedContracts, ContractViewResource::class);
        return Helper::response(true, $data);
    }
}
