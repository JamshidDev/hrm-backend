<?php

namespace Modules\Integration\Services;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Contract;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Department\DepartmentOrganizationResource;
use Modules\Integration\Exceptions\IntegrationServiceException;
use Modules\Integration\Transformers\ContractResource;
use Modules\Integration\Transformers\Position\DepartmentPositionResource;
use Modules\Integration\Transformers\Position\WorkerPositionResource;
use Modules\Turnstile\Http\Controllers\EventController;

class IntegrationService
{

    public function showWorkerTurnstileEventsByMonth($uuid, $filters, $user): JsonResponse
    {
        $workerId = Worker::query()->whereUuid($uuid)->value('id');
        if (!$workerId) {
            throw IntegrationServiceException::notFound(trans('messages.not_found'));
        }
        return app(EventController::class)->showWorkerDurations($workerId);
    }

    public function showWorkerTurnstileEventsByDay($uuid, $filters, $user): JsonResponse
    {
        $workerId = Worker::query()->whereUuid($uuid)->value('id');
        if (!$workerId) {
            throw IntegrationServiceException::notFound(trans('messages.not_found'));
        }
        return app(EventController::class)->showWorkerEventsInDay($workerId);
    }

    public function showWorker($uuid): array
    {
        $worker = Worker::query()
            ->whereUuid($uuid)
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
            throw IntegrationServiceException::notFound(trans('messages.not_found'));
        }
        return app(IntegrationWorkerService::class)->workerData($worker);
    }

    public function contracts($filters, $user): PaginateResource
    {
        $contracts = Contract::query()
            ->filter($user, $filters)
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,first_name,last_name,middle_name,birthday,photo',
                'last_position.position:id,name',
                'last_position.department:id,name',
            ])
            ->when($filters['search'] ?? null, function ($query) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->when($filters['organizations'] ?? null, function ($query, $organizations) {
                $query->whereIn('organization_id', explode(',', $organizations));
            })
            ->when($filters['departments'] ?? null, function ($query, $departments) {
                $query->whereHas('last_position', function ($query) use ($departments) {
                    $query->whereIn('organization_id', explode(',', $departments));
                });
            })
            ->when($filters['status'] ?? null, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? null);

        return PaginateResource::make($contracts, ContractResource::class);
    }

    public function positions($filters): PaginateResource
    {
        $departments = DepartmentPosition::query()
            ->when($filters['organization_id'] ?? null, function ($query, $organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->when($filters['department_id'] ?? null, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($filters['ids'] ?? null, function ($query, $ids) {
                $query->whereIn('id', explode(',', $ids));
            })
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->whereHas('position', function ($query, $search) {
                    $query->whereLike('name', '%' . $search . '%');
                });
            })
            ->with([
                'department',
                'organization',
                'position'
            ])->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($departments, DepartmentPositionResource::class);
    }

    public function workers($filters)
    {
        try {
            $user = auth()->user();
            $query = WorkerPosition::query()
                ->when($filters['organization_id'] ?? null, fn($query, $organizationId) => $query->where('organization_id', $organizationId))
                ->when($filters['department_id'] ?? null, fn($query, $departmentId) => $query->where('department_id', $departmentId))
                ->when($filters['department_position_id'] ?? null, fn($query, $departmentPositionId) => $query->where('department_position_id', $departmentPositionId))
                ->when($filters['departments'] ?? null, fn($query, $departments) => $query->whereIn('department_id', explode(',', $departments)))
                ->when($filters['positions'] ?? null, fn($query, $positions) => $query->whereIn('position_id', explode(',', $positions)))
                ->when($filters['ids'] ?? null, function ($query, $ids) {
                    $query->whereIn('id', explode(',', $ids));
                }, function ($query) use ($user, $filters) {
                    $query->filter($user, $filters);
                })
                ->when($filters['pin'] ?? null, function ($query, $pin) {
                    $query->whereHas('worker', function ($subQuery) use ($pin) {
                        $subQuery->where('pin', $pin);
                    });
                })
                ->when($filters['search'] ?? null, function ($query) {
                    $query->whereHas('worker', function ($subQuery) {
                        $subQuery->searchByFullName();
                    });
                });

            if (request()->has('count')) {
                return $query->count();
            }

            $query = $query->with([
                'department:id,name,level',
                'organization:id,name,group,name_ru,name_en,full_name',
                'department_position.position:id,name',
                'worker:id,uuid,last_name,first_name,middle_name,photo,birthday,pin,country_id,region_id,city_id,sex,card',
                'worker.phones',
                'worker.country:id,name',
                'worker.region:id,name',
                'worker.city:id,name',
            ])
                ->withAggregate('worker', 'last_name')
                ->withAggregate('worker', 'first_name')
                ->withAggregate('worker', 'middle_name');

            if ($filters['order'] ?? null) {
                $orderColumns = explode(',', $filters['order']);
                $direction = $filters['direction'] ?? 'desc';

                foreach ($orderColumns as $column) {
                    $query->orderBy('worker_' . $column, $direction);
                }

            } else {
                $query->orderBy('organization_id')
                    ->orderBy('department_id')
                    ->orderBy('department_position_id')
                    ->orderBy('id');
            }

            $query = $query->paginate($filters['per_page'] ?? 10);
            return PaginateResource::make($query, WorkerPositionResource::class);
        } catch (Exception $e) {
            Helper::setLog($e, 'Integration Workers Error');
            throw IntegrationServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function getDepartmentsAll($filters, $user): PaginateResource
    {
        $matchingNodes = Department::query()
            ->search()
            ->select('id', 'name', 'organization_id')
            ->when($filters['organizations'] ?? null, function ($query, $organizations) {
                $query->whereIn('organization_id', explode(',', $organizations));
            })
            ->when($filters['level'] ?? null, function ($query, $level) {
                $query->where('level', $level);
            })
            ->when($filters['ids'] ?? null, function ($query, $ids) {
                $query->whereIn('id', explode(',', $ids));
            })
            ->with('organization:id,name,name_ru,name_en,group')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($matchingNodes, DepartmentOrganizationResource::class);
    }

    public function workerByPin($filters, $user): array
    {
        $worker = Worker::query()
            ->where('pin', $filters['pin'])
            ->whereHas('position', function ($query) use ($user, $filters) {
                $query->filter($user, $filters);
            })
            ->with([
                'position.department:id,name,level',
                'position.organization:id,name,name_en,name_ru,group,full_name,code',
                'position.position:id,name',
                'phones'
            ])
            ->first();

        if (!$worker?->position) {
            if ($user->id === 1245) {
                $worker = Worker::query()
                    ->where('pin', $filters['pin'])
                    ->whereHas('position', function ($query) {
                        $query->where('organization_id', 196);
                    })
                    ->with([
                        'position.department:id,name,level',
                        'position.organization:id,name,name_en,name_ru,group,full_name,code',
                        'position.position:id,name',
                        'phones'
                    ])
                    ->first();
            }
            if (!$worker?->position) {
                throw IntegrationServiceException::notFound(trans('messages.not_found'));
            }
        }

        return [
            'uuid' => $worker->uuid,
            "fullName" => $worker->full_name(),
            "organization" => $worker->position->organization->name,
            "position" => PositionHelper::getShortPosition($worker->position),
            "phone" => $worker->phones()->first()?->phone,
            "department" => $worker->position->department->name,
            "photo" => Helper::fileUrl($worker->photo),
            'birthday' => $worker->birthday,
            'sex' => $worker->sex
        ];
    }

    public function dashboard($filters, $user): array
    {
        $workersIds = WorkerPosition::filter($user, $filters)
            ->when($filters['departments'] ?? null, function ($query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->select('worker_id');

        $currentDate = $filters['date'] ? Carbon::parse($filters['date']) : now();
        $nextMonth = $currentDate->copy()->addMonth();
        $stats = DB::query()
            ->selectRaw("
                SUM(CASE WHEN latest_to <= ? THEN 1 ELSE 0 END) AS meds_finished,
                SUM(CASE WHEN latest_to > ? AND latest_to < ? THEN 1 ELSE 0 END) AS meds_approaching
            ", [$currentDate->format('Y-m-d'),
                $currentDate->format('Y-m-d'),
                $nextMonth->format('Y-m-d')])
            ->fromSub(function ($query) use ($workersIds) {
                $query->from('meds')
                    ->selectRaw('worker_id, MAX("to") as latest_to')
                    ->whereIn('worker_id', $workersIds)
                    ->groupBy('worker_id');
            }, 'latest_meds')
            ->first();

        return [
            'meds_finished' => $stats->meds_finished ?? 0,
            'meds_approaching' => $stats->meds_approaching ?? 0
        ];
    }
}
