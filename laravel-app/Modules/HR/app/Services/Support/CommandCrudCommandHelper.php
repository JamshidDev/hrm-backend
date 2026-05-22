<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use PhpOffice\PhpWord\TemplateProcessor;

class CommandCrudCommandHelper
{
    public function applyWorkerPositionInfo(TemplateProcessor $temp, array $data, $worker): void
    {
        $group = $data['group'] ?? 1;
        $rank = $data['rank'] ?? 7;

        $temp->setValue('position_date', Helper::getDateTex(Carbon::parse($data['position_date'] ?? null)));
        $temp->setValue('worker_full_name', $worker->full_name());
        $temp->setValue('worker_short_name', $worker->short_name());
        $temp->setValue('group', $group . '-guruh');
        $temp->setValue('rank', $rank . '-razryadi');
        $temp->setValue('salary', number_format((int)$data['salary'], 2));
        $temp->setValue('rate', $data['rate']);
    }

    public function appendWorkerConfirmation(int $commandId, array $data, array &$confirmations): array
    {
        $confirmations[] = [
            'command_id' => $commandId,
            'position' => null,
            'type' => 'w',
            'worker_id' => $data['worker_id'],
            'order' => 1,
        ];

        return $confirmations;
    }

    public function appendWorkerPositionConfirmation(int $commandId, $workerPosition, array &$confirmationData): array
    {
        $confirmationData[] = [
            'command_id' => $commandId,
            'position' => PositionHelper::getShortPosition($workerPosition),
            'type' => 'w',
            'worker_id' => $workerPosition->worker_id,
            'order' => 1,
        ];

        return $confirmationData;
    }
}
