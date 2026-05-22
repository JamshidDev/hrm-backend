<?php

namespace Modules\HR\Http\Controllers\Exports;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Models\ReportExport;
use Modules\HR\Transformers\Export\UserTaskResource;

class ExportTaskController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $tasks = UserExportTask::query()
            ->latest('id')
            ->when(request('organizations'), function ($query) {
                $query->whereHas('user', fn($q) => $q->whereIn('organization_id', explode(',', request('organizations'))));
            })->with(['user.worker:id,first_name,last_name,middle_name,birthday,photo']);

        if (!$user->hasRole('Admin')) {
            $tasks = $tasks->where('user_id', $user->id);
        }

        $data = PaginateResource::make($tasks->paginate(request('per_page', 10)), UserTaskResource::class);
        return Helper::response(true, $data);
    }

    public function markAsRead(Request $request): JsonResponse
    {
        $user = auth()->user();
        if ($request->all) {
            UserExportTask::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()->toDateTimeString()]);
        } else {
            $request->validate(['ids' => 'array']);
            UserExportTask::query()
                ->where('user_id', $user->id)
                ->whereIn('id', $request->ids)
                ->whereNull('read_at')
                ->update(['read_at' => now()->toDateTimeString()]);
        }

        return Helper::response(null);
    }

    public function isNotReadCount(): JsonResponse
    {
        $user = auth()->user();
        $tasks = UserExportTask::query()->whereNull('read_at');
        if (!$user->hasRole('Admin')) {
            $tasks = $tasks->where('user_id', $user->id);
        } else {
            $tasks = $tasks->when(request('organizations'), function ($query) {
                $query->whereHas('user', fn($q) =>
                $q->whereIn('organization_id', explode(',', request('organizations'))));
            });
        }
        $count = $tasks->count();
        return Helper::response(true, compact('count'));
    }

    public function reportExportList(): JsonResponse
    {
        $data = ReportExport::query()->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => $item->type,
                    'name' => $item->name,
                    'description' => $item->description,
                    'photo' => asset($item->photo),
                    'is_active' => $item->is_active
                ];
            });

        return Helper::response(true, $data);
    }

}
