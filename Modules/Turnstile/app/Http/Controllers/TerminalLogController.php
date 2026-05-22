<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\TerminalLogJob;
use App\Jobs\TurnstileJobs\TurnstileExportToExcelJob;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Models\TerminalLog;
use Modules\Turnstile\Transformers\LogResource;

class TerminalLogController extends Controller
{
    public function store(Request $request): bool
    {
        $now = now();
        TerminalLogJob::dispatch($request->all(), $now);
        return true;
    }

    public function index(Request $request): JsonResponse
    {
        [$hour, $minute] = explode(':', $request->first_time);
        $user = auth()->user();

        if ((int)$hour <= 23 && (int)$minute <= 59) {
            $logs = TerminalLog::query()
                ->when(request('search'), function ($query) {
                    $query->whereHas('worker', function ($query) {
                        $query->searchByFullName();
                    });
                })
                ->with(['terminal.building'])
                ->firstEntries($user)
                ->paginate(request('per_page', 10));

            $data = PaginateResource::make($logs, LogResource::class);
        }

        return Helper::response(true, $data ?? []);
    }

    public function export(Request $request): JsonResponse
    {
        $query = $request->all();
        $user = auth()->user();

        $task = UserExportTask::create([
            'user_id' => auth()->id(),
            'type'    => ExportTaskEnum::LATE_COMERS->value,
        ]);

        TurnstileExportToExcelJob::dispatch($task, $query, $user);

        return Helper::response(trans('messages.export.success'));
    }

}
