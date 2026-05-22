<?php

namespace Modules\HR\Http\Controllers\Exports;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Jobs\ReportExport\ByEducationJob;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportExportController extends Controller
{

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required',
        ]);
        return match ($request->type) {
            'by-education-age-invalid' => $this->byEducationAgeInvalid($request->type)
        };
    }

    public function byEducationAgeInvalid($typeExport): JsonResponse
    {
        $user = auth()->user();
        $query = request()->all();
        $type = ExportTaskEnum::REPORT_EXPORT_BY_EDUCATION->value;
        $task = UserExportTask::create(['user_id' => $user->id, 'type' => $type]);
        ByEducationJob::dispatch($task, $user, $query, $typeExport);
        return Helper::response(trans('messages.successfully_exported'));
    }
}
