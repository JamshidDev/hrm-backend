<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Enums\ScheduleTypeEnum;
use Modules\Turnstile\Models\TurnstileScheduleType;
use Modules\Turnstile\Transformers\WorkerSchedule\ScheduleTypeResource;

class TurnstileScheduleTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $data = TurnstileScheduleType::query()
            ->orderBy('type')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'type' => [
                        'id' => $item->type,
                        'name' => ScheduleTypeEnum::get($item->type)
                    ],
                    'days' => $item->days
                ];
            });
        return Helper::response(true, $data);
    }

    public function indexByWorkers(): JsonResponse
    {
        $user = auth()->user();
        $data = TurnstileScheduleType::query()
            ->orderBy('type')
            ->withSum([
                'groups as workers_count_sum' => function ($q) use ($user) {
                $q->filter($user, request()->all());
                }
            ], 'workers_count')
            ->withCount([
                'groups as groups_count' => function ($q) use ($user) {
                $q->filter($user, request()->all());
                }
            ])
            ->paginate(request('per_page', 10));
        $data = PaginateResource::make($data, ScheduleTypeResource::class);
        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'type' => 'required',
            'days' => 'required|array'
        ]);

        TurnstileScheduleType::create($request->all());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, TurnstileScheduleType $scheduleType): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'type' => 'required',
            'days' => 'required|array'
        ]);

        $scheduleType->update($request->all());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(TurnstileScheduleType $scheduleType): JsonResponse
    {
        $scheduleType->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
