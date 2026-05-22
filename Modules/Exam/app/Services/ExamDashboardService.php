<?php

namespace Modules\Exam\Services;

use Modules\Exam\Models\WorkerExam;

class ExamDashboardService
{
    public function workerStatistics(int $workerId, string $from, string $to): array
    {
        $result = WorkerExam::query()
            ->where('worker_id', $workerId)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw(
                "SUM(CASE WHEN result BETWEEN 0 AND 55 THEN 1 ELSE 0 END) as range_0_55,
                SUM(CASE WHEN result BETWEEN 56 AND 71 THEN 1 ELSE 0 END) as range_56_71,
                SUM(CASE WHEN result BETWEEN 72 AND 85 THEN 1 ELSE 0 END) as range_72_85,
                SUM(CASE WHEN result BETWEEN 86 AND 100 THEN 1 ELSE 0 END) as range_86_100"
            )
            ->first();

        return [
            [
                'label' => '0-55',
                'count' => $result->range_0_55 ?? 0,
            ],
            [
                'label' => '56-71',
                'count' => $result->range_56_71 ?? 0,
            ],
            [
                'label' => '72-85',
                'count' => $result->range_72_85 ?? 0,
            ],
            [
                'label' => '86-100',
                'count' => $result->range_86_100 ?? 0,
            ],
        ];
    }
}
