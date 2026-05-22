<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Models\VacationSchedule;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\VacationSchedule\VacationScheduleResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionResource;

class VacationScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $data = VacationSchedule::query()
            ->filter($user, request()->all())
            ->with([
                'organization',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
            ])
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($data, VacationScheduleResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_id'    => 'required|exists:organizations,id',
            'worker_position_id' => 'required|exists:worker_positions,id',
            'month'              => 'required|integer|min:1|max:12',
        ]);

        $workerPosition = WorkerPosition::find($validated['worker_position_id']);

        VacationSchedule::query()
            ->updateOrCreate([
                'organization_id' => $validated['organization_id'],
                'contract_id'     => $workerPosition->contract_id,
                'worker_id'       => $workerPosition->worker_id,
            ], [
                'worker_position_id' => $validated['worker_position_id'],
                'month'              => $validated['month'],
            ]);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, VacationSchedule $vacationSchedule): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'sometimes|integer|min:1|max:12',
        ]);

        $vacationSchedule->update($validated);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(VacationSchedule $vacationSchedule): JsonResponse
    {
        $vacationSchedule->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function noVacationScheduleWorkers(Request $request): JsonResponse
    {
        $user = auth()->user();
        $workers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->whereHas('contract', function ($query) {
                $query->doesntHave('vacation_schedule');
            })
            ->search()
            ->with([
                'department:id,name',
                'organization:id,name,name_en,name_ru,group',
                'position:id,name',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
            ])
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($workers, WorkerPositionResource::class);

        return Helper::response(true, $data);
    }
}
