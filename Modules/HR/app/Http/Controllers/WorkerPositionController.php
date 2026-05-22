<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Services\ChangePushRabbitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\DTO\WorkerPositionDTO;
use Modules\HR\Http\Requests\WorkerPosition\AttachDetachRoleRequest;
use Modules\HR\Http\Requests\WorkerPosition\UpdateWorkerPositionRequest;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Services\WorkerPositionService;
use Modules\HR\Services\WorkerRoleService;
use Modules\HR\Transformers\Worker\WorkerShowResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionFullResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionInfosResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionResource;

class WorkerPositionController implements HasMiddleware
{
    public function __construct(
        protected WorkerPositionService $positionService,
        protected WorkerRoleService     $roleService,
        protected ChangePushRabbitService $changePush,
    ){}

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $data = WorkerPosition::query()
            ->select(
                'id',
                'uuid',
                'position_id',
                'position_date',
                'worker_id',
                'organization_id',
                'department_id',
                'group',
                'rate',
                'rank',
                'type',
                'salary'
            )
            ->filter($user, request()->all())
            ->remainingFilter()
            ->search()
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->orderBy('id')
            ->paginate($per_page);

        $data->load([
            'department:id,name,level',
            'organization:id,name,name_en,name_ru,group',
            'position:id,name,name_ru,name_en',
            'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
        ]);

        $positions = PaginateResource::make($data, WorkerPositionResource::class);
        return Helper::response(true, $positions);
    }

    public static function middleware(): array
    {
        return [
            new Middleware('can:hr-workers-write', only: ['edit', 'updatePosition', 'detachRole', 'attachRole']),
            new Middleware('can:hr-workers-read', only: ['index', 'show'])
        ];
    }

    public function positionInfos($workerPosition): JsonResponse
    {
        $workerPosition = WorkerPosition::with([
            'department',
            'organization:id,name,name_ru,name_en,group',
            'position',
            'worker:id,last_name,first_name,middle_name,photo,birthday',
            'contract',
            'schedules.work_days'
        ])->find($workerPosition);

        $workerPosition = new WorkerPositionInfosResource($workerPosition);
        return Helper::response(true, $workerPosition);
    }

    public function edit($uuid): JsonResponse
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
                'profile.roles',
                'profile.organizations',
                'passports',
                'nationality',
                'universities.speciality',
                'universities.university',
                'positions.organization',
                'positions.department',
                'positions.position',
                'positions.contract',
                'positions.schedule',
                'academic_degrees',
                'academic_titles',
            ])
            ->firstOrFail();

        $worker = new WorkerShowResource($worker);
        return Helper::response(true, $worker);
    }

    public function show($uuid): JsonResponse
    {
        $user = auth()->user();
        $workerPosition = WorkerPosition::query()
            ->whereUuid($uuid)
            ->with([
                'worker.photos',
                'worker.phones',
                'worker.current_city',
                'worker.current_region',
                'worker.region',
                'worker.city',
                'worker.country',
                'worker.languages',
                'worker.relatives',
                'worker.profile',
                'worker.passports',
                'worker.nationality',
                'worker.old_careers',
                'worker.academic_degrees',
                'worker.academic_titles',
                'worker.universities.speciality',
                'worker.universities.university',
                'worker.meds',
                'worker.vacations',
                'department:id,name,level',
                'organization:id,name,name_en,name_ru,group,full_name',
                'worker.all_positions.organization:id,name,name_en,name_ru,full_name,group',
                'worker.all_positions.department:id,name,level',
                'worker.all_positions.position:id,name',
                'worker.all_positions.contract',
                'worker.incentives',
                'worker.incentives.organization',
                'worker.disciplinaryActions',
                'worker.disciplinaryActions.organization',
                'worker.exams',
                'worker.exams.exam',
                'worker.exams.exam.topic'
            ])->firstOrFail();

        if ($user->hasPermissionTo('economist-statements')) {
            $workerPosition->load([
                'worker.statementsByPin',
                'worker.statementsByPin.organization',
            ]);
        }

        $workerPosition = new WorkerPositionFullResource($workerPosition);

        return Helper::response(true, $workerPosition);
    }

    public function newCareers($uuid): JsonResponse
    {
        $worker = Worker::query()
            ->whereUuid($uuid)
            ->with([
                'all_positions.organization',
                'all_positions.department',
                'all_positions.position',
                'all_positions.contract',
            ])
            ->first();

        $a = $this->positionService->positions($worker?->all_positions);

        return Helper::response(true, $a);
    }

    public function deleteNewCareer($positionId): JsonResponse
    {
        $workerPosition = WorkerPosition::query()->findOrFail($positionId);
        $this->positionService->delete($workerPosition);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function updatePosition(int $id, UpdateWorkerPositionRequest $request): JsonResponse
    {
        $workerPosition = $this->positionService->update($id, WorkerPositionDTO::fromRequest($request->validated()));

        $this->changePush->workerPositionUpdate($workerPosition);

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function attachRole(
        string                  $uuid,
        AttachDetachRoleRequest $request
    ): JsonResponse
    {
        $this->roleService->attach(
            $uuid,
            $request->role,
            $request->organization_id
        );

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function detachRole(
        string                  $uuid,
        AttachDetachRoleRequest $request
    ): JsonResponse
    {
        $this->roleService->detach(
            $uuid,
            $request->organization_id
        );

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
