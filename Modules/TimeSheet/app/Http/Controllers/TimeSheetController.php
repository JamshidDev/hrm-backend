<?php

namespace Modules\TimeSheet\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\TimesheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Models\TimesheetConfirmation;
use Modules\Confirmation\Transformers\TimesheetConfirmationResource;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\TimeSheet\Enums\TimeSheetTypeEnum;
use Modules\TimeSheet\Models\TimeSheet;
use Modules\TimeSheet\Transformers\TimeSheetResource;

class TimeSheetController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = TimeSheet::query()
            ->filter(request()->all())
            ->with(['department'])
            ->paginate($per_page);

        $data = PaginateResource::make($data, TimeSheetResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'year'  => 'required',
            'month' => 'required',
        ]);

        $data = $request->all();
        $data['user_id'] = auth()->user()->id;

        TimeSheet::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, $timeSheetId): JsonResponse
    {
        $request->validate([
            'year'  => 'required',
            'month' => 'required',
        ]);

        $timeSheet = TimeSheet::query()->findOrFail($timeSheetId);

        if (!$timeSheet) {
            return Helper::response(false, trans('messages.not_found'));
        }

        $timeSheet->year = $request->year;
        $timeSheet->month = $request->month;
        $timeSheet->department_id = $request->department_id;
        $timeSheet->work_place_id = $request->work_place_id;

        if ($request->status) {
            $timeSheet = TimesheetService::excelGenerate($timeSheet, $timeSheet->file);
        }

        $timeSheet->save();

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function accept($timeSheetId): JsonResponse
    {
        $timeSheet = TimeSheet::query()->findOrFail($timeSheetId);
        if (!$timeSheet) {
            return Helper::response(false, trans('messages.not_found'));
        }
        $timeSheet = TimesheetService::excelGenerate($timeSheet, $timeSheet->file);
        $timeSheet->status = true;
        $timeSheet->save();

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(TimeSheet $timeSheet): JsonResponse
    {
        $timeSheet->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function attachConfirmations($timesheetId, Request $request): JsonResponse
    {
        $request->validate([
            'confirmations' => 'required|array',
        ]);

        $confirms = collect($request->confirmations);

        $confirmations = ConfirmationWorker::query()
            ->whereIn('id', $confirms->pluck('id')->toArray())->get();

        foreach ($request->confirmations as $confirmation) {
            $confirm = $confirmations->where('id', $confirmation['id'])->first();

            TimesheetConfirmation::query()
                ->updateOrCreate(
                    [
                        'time_sheet_id' => $timesheetId,
                        'worker_id'     => $confirm->worker_id,
                    ],
                    [
                        'main'     => $confirmation['main'],
                        'order'    => $confirmation['order'],
                        'position' => $confirm->position,
                        'type'     => 's'
                    ]
                );
        }

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function getConfirmations($timesheetId): JsonResponse
    {
        $confirmations = TimesheetConfirmation::query()->where('time_sheet_id', $timesheetId)->get();

        $confirmations = TimesheetConfirmationResource::collection($confirmations);

        return Helper::response(true, [
            'confirmations' => $confirmations
        ]);
    }

    public function reattach($timesheetId, $confirmationId): JsonResponse
    {
        TimesheetConfirmation::query()->findOrFail($confirmationId)?->delete();

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function departments(): JsonResponse
    {
        $user = auth()->user()->load([
            'worker.time_sheet_departments',
            'worker.time_sheet_organizations'
        ]);

        $departments = DepartmentListResource::collection($user->worker->time_sheet_departments);
        $organizations = OrganizationListResource::collection($user->worker->time_sheet_organizations);

        return Helper::response(true, [
            'departments'   => $departments,
            'organizations' => $organizations
        ]);
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'timesheet_types' => TimeSheetTypeEnum::list()
        ]);
    }
}
