<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use PhpOffice\PhpWord\TemplateProcessor;

class SingleWorkerVacationCommandHelper
{
    public function applyStartDates(TemplateProcessor $temp, $workerPosition, array $data): array
    {
        $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($workerPosition)));
        $temp->setValue('worker_full_name', $workerPosition->worker->full_name());
        $temp->setValue('worker_short_name', $workerPosition->worker->short_name());

        $toDate = $data['to'] ?? $data['work_day'];
        $to = Helper::getDateTex(Carbon::parse($toDate));
        $from = Helper::getDateTex(Carbon::parse($data['from']));
        $workDay = Helper::getDateTex(Carbon::parse($data['work_day']));

        return [$to, $from, $workDay];
    }

    public function syncCreateCommandData(
        $command,
        $workerPosition,
        array $data,
        array &$confirmations,
        array &$jsonData,
        callable $appendConfirmation
    ): array {
        if ($command) {
            $jsonData['status'] = 'create';
            $jsonData['data'] = [
                'worker_id' => $workerPosition->worker_id,
                'worker_position_id' => $workerPosition->id,
                'organization_id' => $workerPosition->organization_id,
                'contract_id' => $workerPosition->contract_id,
                'command_id' => $command->id,
                'type' => $data['command_type'],
                'from' => $data['from'],
                'to' => $data['to'] ?? null,
                'all_day' => $data['all_day'],
                'work_day' => $data['work_day'],
            ];

            $confirmations = $appendConfirmation($command->id, $workerPosition, $confirmations);
        }

        return $confirmations;
    }
}
