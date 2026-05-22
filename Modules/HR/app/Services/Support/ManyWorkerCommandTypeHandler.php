<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Modules\HR\Enums\VacationAdditionalEnum;
use PhpOffice\PhpWord\TemplateProcessor;

readonly class ManyWorkerCommandTypeHandler
{
    public function __construct(
        private ManyWorkerCommandHelper $manyWorkerCommandHelper
    ) {
    }

    public function handleFortyOneType(TemplateProcessor $temp, array $data, $command, array &$confirmations, array &$jsonData): void
    {
        $vacations = [];
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions']);
        $workerPositions = $manyWorkers['worker_positions'];
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
        }

        $jsonData['status'] = 'insert';
        foreach ($workerPositions as $workerPosition) {
            $requestWorkerPosition = $requestWorkerPositions->get($workerPosition->id);

            $dates = [
                'period_from' => Helper::getDateTex(Carbon::parse($requestWorkerPosition['period_from'])),
                'period_to' => Helper::getDateTex(Carbon::parse($requestWorkerPosition['period_to'])),
                'from' => Helper::getDateTex(Carbon::parse($requestWorkerPosition['from'])),
                'to' => Helper::getDateTex(Carbon::parse($requestWorkerPosition['to'])),
                'work_day' => Helper::getDateTex(Carbon::parse($requestWorkerPosition['work_day'] ?? $requestWorkerPosition['to'])),
            ];

            $vacationAdditional = collect($requestWorkerPosition['additional'])
                ->map(fn($additional) => strtolower(VacationAdditionalEnum::get($additional['id'])) . ' ' . $additional['value'] . ' kun')
                ->implode(', ');

            if ($vacationAdditional) {
                $vacationAdditional = '(' . $vacationAdditional . ')';
            }

            $vacations[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'period_from' => $dates['period_from'],
                'period_to' => $dates['period_to'],
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'all_day' => $requestWorkerPosition['all_day'],
                'additional' => $vacationAdditional,
                'from' => $dates['from'],
                'to' => $dates['to'],
                'work_day' => $dates['work_day']
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'contract_id' => $workerPosition->contract_id,
                    'command_id' => $command->id,
                    'type' => $data['command_type'],
                    'all_day' => $requestWorkerPosition['all_day'],
                    'main_day' => $requestWorkerPosition['main_day'] ?? 0,
                    'second_day' => $requestWorkerPosition['second_day'] ?? 0,
                    'period_from' => $requestWorkerPosition['period_from'] ?? null,
                    'period_to' => $requestWorkerPosition['period_to'] ?? null,
                    'from' => $requestWorkerPosition['from'],
                    'to' => $requestWorkerPosition['to'],
                    'work_day' => $requestWorkerPosition['work_day'] ?? null,
                ];
            }
        }

        $temp->cloneRowAndSetValues('worker_full_name', $vacations);
    }

    public function handleFiftyFiveType(TemplateProcessor $temp, array $data, $command, array &$confirmations, array &$jsonData): void
    {
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions']);
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];
        $workerPositions = $manyWorkers['worker_positions'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
            $jsonData['status'] = 'insert';
        }

        $vacations = [];

        foreach ($workerPositions as $workerPosition) {
            $req = $requestWorkerPositions->get($workerPosition->id);

            $from = Carbon::parse($req['from']);
            $to   = Carbon::parse($req['to']);

            $fromText = Helper::getDateTex($from);
            $toText   = Helper::getDateTex($to);

            $fromTime = $req['from_time'] ?? null;
            $toTime   = $req['to_time'] ?? null;

            $vacationTimes = match (true) {
                $from->ne($to) && $fromTime && $toTime =>
                "$fromText $fromTime dan $toText $toTime gacha",

                $from->ne($to) && $fromTime =>
                "$fromText $fromTime dan $toText gacha",

                $from->ne($to) && $toTime =>
                "$fromText dan $toText $toTime gacha",

                $from->ne($to) =>
                "$fromText dan $toText gacha",

                $fromTime && $toTime =>
                "$fromText $fromTime dan $toTime gacha",

                $fromTime =>
                "$fromText $fromTime dan",

                $toTime =>
                "$fromText $toTime gacha",

                default =>
                "$fromText kuni",
            };

            $workDay = !empty($req['work_day'])
                ? Helper::getDateTex(Carbon::parse($req['work_day']))
                : Helper::getDateTex($to->copy()->addDay());

            $vacations[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'vacation_dates' => $vacationTimes,
                'work_day' => $workDay
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'contract_id' => $workerPosition->contract_id,
                    'command_id' => $command->id,
                    'type' => $data['command_type'],
                    'from' => $req['from'],
                    'to' => $req['to'],
                    'work_day' => $req['to'],
                ];
            }
        }

        $temp->cloneRowAndSetValues('worker_full_name', $vacations);
    }

    public function handleSixtyTwoType(TemplateProcessor $temp, array $data, $command, array &$confirmations, array &$jsonData): void
    {
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions'], true);
        $workerPositions = $manyWorkers['worker_positions'];
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];
        $organizationMap = $manyWorkers['destination_organizations'];
        $departmentMap = $manyWorkers['destination_departments'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
            $jsonData['status'] = 'insert';
        }

        $trips = [];
        $workers = [];
        foreach ($workerPositions as $workerPosition) {
            $requestWorkerPosition = $requestWorkerPositions->get($workerPosition->id);

            $from = Helper::getDateTex(Carbon::parse($requestWorkerPosition['from']));
            $to = Helper::getDateTex(Carbon::parse($requestWorkerPosition['to']));

            if (array_key_exists('work_place_id', $requestWorkerPosition)) {
                $workPlaceName = $organizationMap->get($requestWorkerPosition['work_place_id']);
                if (array_key_exists('department_id', $requestWorkerPosition)) {
                    $departmentName = $departmentMap->get($requestWorkerPosition['department_id']);
                    $toOrganization = trim($workPlaceName . ' ' . $departmentName);
                } else {
                    $toOrganization = $workPlaceName;
                }
            } else {
                $toOrganization = $requestWorkerPosition['to_organization'];
            }

            $workers[] = $workerPosition->worker->short_name();
            $trips[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'to_organization' => $toOrganization . 'ga',
                'reason' => $requestWorkerPosition['reason'],
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'contract_date' => $workerPosition->contract?->contract_date,
                'contract_number' => $workerPosition->contract?->contract_number,
                'from' => $from,
                'to' => $to,
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'contract_id' => $workerPosition->contract_id,
                    'work_place_id' => $requestWorkerPosition['work_place_id'] ?? null,
                    'department_id' => $requestWorkerPosition['department_id'] ?? null,
                    'to_organization' => $toOrganization,
                    'command_id' => $command->id,
                    'type' => $data['command_type'],
                    'from' => $requestWorkerPosition['from'],
                    'to' => $requestWorkerPosition['to'],
                    'reason' => $requestWorkerPosition['reason']
                ];
            }
        }

        $workersText = count($workers) > 1
            ? implode(', ', $workers) . 'lar'
            : ($workers[0] ?? '');

        $temp->setValue('workers', $workersText);
        $temp->cloneRowAndSetValues('worker_full_name', $trips);
    }

    public function handleSeventyOneType(TemplateProcessor $temp, array $data, $command, array &$confirmations, array &$jsonData): void
    {
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions']);
        $workerPositions = $manyWorkers['worker_positions'];
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
            $jsonData['status'] = 'insert';
        }

        $trips = [];
        foreach ($workerPositions as $workerPosition) {
            $requestWorkerPosition = $requestWorkerPositions->get($workerPosition->id);
            $trips[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'reason' => strtolower($requestWorkerPosition['reason']),
                'gift' => $requestWorkerPosition['gift']
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'command_id' => $command->id,
                    'number' => $command->command_number,
                    'reason' => $requestWorkerPosition['reason'],
                    'by_whom' => $requestWorkerPosition['by_whom'],
                    'gift' => $requestWorkerPosition['gift'],
                    'gift_type' => $requestWorkerPosition['gift_type'],
                    'date' => $command->command_date,
                ];
            }
        }

        $temp->setValue('base', $data['base'] ?? '');
        $temp->cloneRowAndSetValues('worker_full_name', $trips);
    }

    public function handleSeventyTwoType(TemplateProcessor $temp, array $data, $command, array &$confirmations, array &$jsonData): void
    {
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions']);
        $workerPositions = $manyWorkers['worker_positions'];
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
            $jsonData['status'] = 'insert';
        }

        $trips = [];
        foreach ($workerPositions as $workerPosition) {
            $requestWorkerPosition = $requestWorkerPositions->get($workerPosition->id);
            $trips[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'reason' => $requestWorkerPosition['reason'],
                'fine' => $requestWorkerPosition['fine']
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'command_id' => $command->id,
                    'number' => $command->command_number,
                    'reason' => $requestWorkerPosition['reason'],
                    'fine' => $requestWorkerPosition['fine'],
                    'fine_type' => $requestWorkerPosition['fine_type'],
                    'date' => $command->command_date,
                ];
            }
        }

        $temp->cloneRowAndSetValues('worker_full_name', $trips);
    }

    public function handleSeventyThreeType(
        TemplateProcessor $temp,
        array $data,
        $command,
        array &$confirmations,
        array &$jsonData,
        callable $setAdditionalToCommand
    ): void {
        $manyWorkers = $this->manyWorkerCommandHelper->prepare($data['worker_positions']);
        $workerPositions = $manyWorkers['worker_positions'];
        $requestWorkerPositions = $manyWorkers['request_worker_positions'];

        if ($command) {
            $confirmations = $this->manyWorkerCommandHelper->appendCommandConfirmations($command->id, $workerPositions, $confirmations);
            $jsonData['status'] = 'insert';
        }

        $trips = [];
        foreach ($workerPositions as $workerPosition) {
            $requestWorkerPosition = $requestWorkerPositions->get($workerPosition->id);

            if ($requestWorkerPosition['type'] === 1) {
                $finText = "mehnatga haq to'lash eng kam miqdorining " . $requestWorkerPosition['amount'] . " barobari ko'rinishida ";
            } else {
                $finText = "uzluksiz ish stajiga bog'liq ravishda lavozim maoshinining " . $requestWorkerPosition['amount'] . "% miqdorida ";
            }

            $trips[] = [
                'worker_full_name' => $workerPosition->worker->full_name(),
                'post_name' => strtolower(PositionHelper::getShortPosition($workerPosition)),
                'reason' => strtolower($requestWorkerPosition['reason']),
                'financial_assistance' => $finText
            ];

            if ($command) {
                $jsonData['data'][] = [
                    'worker_id' => $workerPosition->worker_id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'command_id' => $command->id,
                    'number' => $command->command_number,
                    'reason' => $requestWorkerPosition['reason'],
                    'amount_text' => $finText,
                    'type' => $requestWorkerPosition['type'],
                    'amount' => (double)$requestWorkerPosition['amount'],
                    'date' => $command->command_date,
                ];
            }
        }

        $temp->cloneRowAndSetValues('worker_full_name', $trips);
        $setAdditionalToCommand($temp, $data);
    }
}
