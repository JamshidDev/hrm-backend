<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Models\DepartmentPosition;
use Modules\Structure\Models\Position;
use PhpOffice\PhpWord\TemplateProcessor;

class CommandCrudTypeHandler
{
    public function handleCreateType(
        TemplateProcessor $temp,
        array $data,
        $worker,
        $command,
        array &$confirmations,
        array &$jsonData,
        CommandCrudCommandHelper $helper
    ): void {
        if (array_key_exists('department_position_id', $data)) {
            $departmentPosition = DepartmentPosition::with(['organization', 'department', 'position'])
                ->find($data['department_position_id']);
            $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($departmentPosition)));
        } elseif (array_key_exists('position_id', $data)) {
            $position = Position::find($data['position_id']);
            $temp->setValue('post_name', strtolower($position->name));
        }

        $probation = $data['probation']
            ? ProbationEnum::get($data['probation'], 'uz') . ' sinov muddati bilan'
            : 'sinovsiz';

        $temp->setValue('probation', $probation);
        $helper->applyWorkerPositionInfo($temp, $data, $worker);
        $temp->setValue('contract_date', Helper::getDateTex(Carbon::parse($data['contract_date'])));
        $temp->setValue('contract_number', $data['number']);

        if ($command) {
            $jsonData['status'] = 'create';
            $data['command_id'] = $command->id;
            $jsonData['data'] = $data;
            $confirmations = $helper->appendWorkerConfirmation($command->id, $data, $confirmations);
        }
    }

    public function handleUpdateType(
        TemplateProcessor $temp,
        array $data,
        $workerPosition,
        $command,
        array &$confirmations,
        array &$jsonData,
        CommandCrudCommandHelper $helper
    ): void {
        $worker = $workerPosition->worker;
        $contract = $workerPosition->contract;

        if ($command) {
            $confirmations = $helper->appendWorkerPositionConfirmation($command->id, $workerPosition, $confirmations);
        }

        if ($data['command_type'] === CommandTypeEnum::TWENTY_ONE->value) {
            $departmentPosition = DepartmentPosition::with(['organization', 'department', 'position'])
                ->find($data['department_position_id']);
            $data['post_name'] = strtolower(PositionHelper::getShortPosition($departmentPosition));
        }

        $helper->applyWorkerPositionInfo($temp, $data, $worker);
        $temp->setValue('contract_date', $contract?->contract_date);
        $temp->setValue('contract_number', $contract?->number);
        $temp->setValue('worker_position', PositionHelper::getShortPosition($workerPosition));
        $temp->setValue('position_to_date', $contract?->contract_to_date ?? '');
        $temp->setValue('post_name', $data['post_name'] ?? '');

        if ($command) {
            $jsonData['status'] = 'update';
            $jsonData['id'] = $workerPosition->id;
            $data['command_id'] = $command->id;
            $jsonData['data'] = $data;
        }
    }

    public function handleDeleteType(
        TemplateProcessor $temp,
        array $data,
        $workerPosition,
        $command,
        array &$confirmations,
        array &$jsonData,
        CommandCrudCommandHelper $helper,
        callable $setAdditionalToCommand
    ): void {
        $worker = $workerPosition->worker;
        $contract = $workerPosition->contract;
        $data['contract_date'] = $contract?->contract_date;
        $data['contract_id'] = $workerPosition->contract_id;

        if ($command) {
            $confirmations = $helper->appendWorkerPositionConfirmation($command->id, $workerPosition, $confirmations);
        }

        $setAdditionalToCommand($temp, $data);
        $temp->setValue('contract_to_date', Helper::getDateTex(Carbon::parse($data['contract_to_date'])));
        $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($workerPosition)));
        $temp->setValue('worker_full_name', $worker->full_name());
        $temp->setValue('worker_short_name', $worker->short_name());
        $temp->setValue('contract_date', Helper::getDateTex(Carbon::parse($data['contract_date'])));
        $temp->setValue('contract_number', $contract?->number);

        if ($command) {
            $jsonData['status'] = 'delete';
            $jsonData['id'] = $workerPosition?->id;
            $data['command_id'] = $command->id;
            $jsonData['data'] = $data;
        }
    }
}
