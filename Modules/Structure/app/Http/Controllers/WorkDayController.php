<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\WorkDay;
use Modules\Structure\Transformers\Structure\WorkDayResource;

class WorkDayController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = WorkDay::query()->Filter()->Search()->paginate($per_page);

        $workDays = PaginateResource::make($data, WorkDayResource::class);

        return Helper::response(true, $workDays);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'schedule_id' => 'required|exists:schedules,id',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'day_of_week' => 'required|in:1,2,3,4,5,6,7',
            'type' => 'required',
        ]);

        WorkDay::query()->create($request->all());

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, WorkDay $workDay): JsonResponse
    {
        $request->validate([
            'schedule_id' => 'required|exists:schedules,id',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'day_of_week' => 'required|in:1,2,3,4,5,6,7',
            'type' => 'required',
        ]);

        $workDay->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(WorkDay $workDay): JsonResponse
    {
        $workDay->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
