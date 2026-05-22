<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\Schedule;
use Modules\Structure\Transformers\Structure\ScheduleResource;

class ScheduleController implements HasMiddleware
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

        $data = Schedule::query()->Search()
            ->with('work_days')
            ->paginate($per_page);

        $schedules = PaginateResource::make($data, ScheduleResource::class);

        return Helper::response(true, $schedules);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'type' => 'required',
        ]);

        Schedule::query()->create($request->all());

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'type' => 'required'
        ]);

        $schedule->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Schedule $schedule): JsonResponse
    {
        $schedule->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
