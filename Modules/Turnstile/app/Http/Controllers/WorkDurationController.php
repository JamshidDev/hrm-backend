<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Models\TerminalLog;
use Modules\Turnstile\Transformers\LogResource;
use Modules\Turnstile\Transformers\TerminalLogResource;

class WorkDurationController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $data = TerminalLog::query()
            ->with([
                'worker_position:id,department_id,position_id,organization_id',
                'worker_position.organization:id,name,name_ru,name_en,group',
                'worker_position.position:id,name',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
                'terminal:id,name,name_ru,name_en',
                'terminal.building'
            ])
            ->whereHas('worker', function ($query) use ($user) {
                $query->whereHas('positions', function ($query) use ($user) {
        $query->filter($user, request()->all());
                });
            })
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->when(request('start'), function ($query, $start) {
                $query->where('event_time', '>=', $start);
            })
            ->when(request('end'), function ($query, $end) {
                $query->where('event_time', '<=', $end);
            })
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, LogResource::class);

        return Helper::response(true, $data);
    }

    public function logs(Request $request): JsonResponse
    {
        $data = TerminalLog::query()
            ->where('worker_id', $request->worker_id)
            ->whereDate('event_time', $request->date)
            ->get();

        $data = TerminalLogResource::collection($data);

        return Helper::response(true, $data);
    }


}
