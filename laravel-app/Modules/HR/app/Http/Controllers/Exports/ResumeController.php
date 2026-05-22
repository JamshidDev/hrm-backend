<?php

namespace Modules\HR\Http\Controllers\Exports;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Jobs\HR\WorkersResumesZipJob;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Services\WorkerPositionService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ResumeController implements HasMiddleware
{
    public function __construct(
        protected WorkerPositionService $positionService
    ){}

    public static function middleware(): array
    {
        return [
            new Middleware('can:worker-resume-download', only: ['downloadResume', 'exportResumesToZip']),
            new Middleware('can:export-workers-zip', only: ['exportResumesToZip'])
        ];
    }

    public function downloadResume($uuid): BinaryFileResponse
    {
        return $this->positionService->downloadResume($uuid);
    }

    public function exportResumesToZip(Request $request): JsonResponse
    {
        $query = (array)$request->all()['query'];
        $user = auth()->user();

        $task = UserExportTask::create([
            'user_id' => $user->id,
            'type'    => ExportTaskEnum::WORKERS_RESUMES->value,
        ]);

        WorkersResumesZipJob::dispatch($task, $query, $user);

        return Helper::response(trans('messages.export.success'));
    }

}
