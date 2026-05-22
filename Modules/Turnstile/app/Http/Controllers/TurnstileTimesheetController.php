<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Jobs\TurnstileJobs\TimeSheetExportToExcelJob;
use App\Models\UserExportTask;
use Illuminate\Http\Request;

class TurnstileTimesheetController extends Controller
{
    public function exportTimeSheet(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer',
            'organization_id' => 'required|integer'
        ]);

        $user = auth()->user();
        $task = UserExportTask::create([
            'user_id' => $user->id,
            'type' => ExportTaskEnum::TIMESHEET_TURNSTILE_SCHEDULE->value,
        ]);

        $query = $request->all();
        TimeSheetExportToExcelJob::dispatch($task, $query, $user);
        return Helper::response(trans('messages.successfully_exported'));
    }

}
