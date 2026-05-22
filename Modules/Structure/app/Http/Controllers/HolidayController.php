<?php

namespace Modules\Structure\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Cache;
use Modules\Structure\Models\Holiday;
use Modules\Structure\Transformers\Structure\HolidayResource;

class HolidayController implements HasMiddleware
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

        $data = Holiday::query()->search()->paginate($per_page);

        $data = PaginateResource::make($data, HolidayResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'holiday_date' => 'required',
            'type' => 'required',
        ]);

        Holiday::query()->create($request->all());
        $date = Carbon::parse($request->holiday_date);
        $month = $date->month;
        $year = $date->year;
        Cache::delete('days_in_month_' . $year . '_' . $month);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Holiday $holiday): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'holiday_date' => 'required',
            'type' => 'required',
        ]);

        $holiday->update($request->all());
        $date = Carbon::parse($request->holiday_date);
        $month = $date->month;
        $year = $date->year;
        Cache::delete('days_in_month_' . $year . '_' . $month);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Holiday $holiday): JsonResponse
    {
        $holiday->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
