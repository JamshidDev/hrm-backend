<?php

namespace Modules\Economist\Services\Support;

use App\Enums\ExportTaskEnum;
use App\Jobs\Economist\MultipleStatementsJob;
use App\Jobs\Economist\StatementExportByYearWithCodesJob;
use App\Jobs\Economist\StatementExportWithCodesByWorkersJob;
use App\Jobs\Economist\StatementExportWithCodesJob;
use App\Jobs\Economist\StatementsByPositionJob;
use App\Models\UserExportTask;

class StatementExportService
{
    public function exportWithCodes(array $data, $user): void
    {
        $taskType = $data['type'] === 'organizations'
            ? ExportTaskEnum::STATEMENT_WITH_CODES_BY_ORGANIZATION->value
            : ExportTaskEnum::STATEMENT_WITH_CODES_BY_WORKERS->value;

        $task = $this->createTask($user->id, $taskType);

        if ($data['type'] === 'organizations') {
            StatementExportWithCodesJob::dispatch($task, $user, $data);
            return;
        }

        StatementExportWithCodesByWorkersJob::dispatch($task, $user, $data);
    }

    public function exportWithCodesByYear(array $data, $user): void
    {
        StatementExportByYearWithCodesJob::dispatch(
            $this->createTask($user->id, ExportTaskEnum::STATEMENT_WITH_CODES_BY_WORKERS->value),
            $user,
            $data
        );
    }

    public function exportMultipleStatementWorkers(array $data, $user): void
    {
        MultipleStatementsJob::dispatch(
            $this->createTask($user->id, ExportTaskEnum::STATEMENT_MULTIPLE_WORKERS->value),
            $user,
            $data
        );
    }

    public function downloadWorkersByPositions(array $filters, $user): void
    {
        StatementsByPositionJob::dispatch(
            $filters,
            $this->createTask($user->id, ExportTaskEnum::STATEMENTS_BY_POSITIONS->value),
            $user
        );
    }

    private function createTask(int $userId, int $type): UserExportTask
    {
        return UserExportTask::query()->create([
            'user_id' => $userId,
            'type' => $type,
        ]);
    }
}
