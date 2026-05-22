<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Modules\HR\Enums\CommandReasonTypeEnum;
use Modules\HR\Enums\VacationAdditionalEnum;
use Modules\HR\Models\Vacation;
use PhpOffice\PhpWord\TemplateProcessor;

class SingleWorkerVacationCommandTypeHandler
{
    public function handleFortyThreeType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        callable $appendConfirmation
    ): void {
        $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($workerPosition)));
        $temp->setValue('worker_full_name', $workerPosition->worker->full_name());
        $temp->setValue('worker_short_name', $workerPosition->worker->short_name());

        $lastVacation = $workerPosition?->contract->last_vacation;
        $periodFrom = Helper::getDateTex(Carbon::parse($lastVacation?->period_from));
        $periodTo = Helper::getDateTex(Carbon::parse($lastVacation?->period_to));
        $allDay = $lastVacation?->all_day;
        $to = Helper::getDateTex(Carbon::parse($lastVacation?->to));
        $newToDate = Helper::getDateTex(Carbon::parse($data['new_date']));

        $temp->setValue('period_from', $periodFrom);
        $temp->setValue('period_to', $periodTo);
        $temp->setValue('all_day', $allDay);
        $temp->setValue('to', $to);
        $temp->setValue('new_date', $newToDate);
        $temp->setValue('work_day', $newToDate);
        $temp->setValue('reason', CommandReasonTypeEnum::get($data['reason']));

        if ($command) {
            $jsonData['status'] = 'update';
            $jsonData['id'] = $lastVacation?->id;
            $jsonData['data'] = [
                'worker_id' => $workerPosition->worker_id,
                'worker_position_id' => $workerPosition->id,
                'organization_id' => $workerPosition->organization_id,
                'contract_id' => $workerPosition->contract_id,
                'to' => $data['new_date'],
                'work_day' => $data['work_day'],
                'command_id' => $command->id
            ];

            $confirmations = $appendConfirmation($command->id, $workerPosition, $confirmations);
        }
    }

    public function handleFortyFourType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        callable $appendConfirmation
    ): void {
        $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($workerPosition)));
        $temp->setValue('worker_full_name', $workerPosition->worker->full_name());
        $temp->setValue('worker_short_name', $workerPosition->worker->short_name());
        $newToDate = Helper::getDateTex(Carbon::parse($data['new_date']));

        $lastVacation = $workerPosition?->contract->last_vacation;
        $periodFrom = Helper::getDateTex(Carbon::parse($lastVacation?->period_from));
        $periodTo = Helper::getDateTex(Carbon::parse($lastVacation?->period_to));
        $allDay = $lastVacation->all_day ?? 0;
        $to = Helper::getDateTex(Carbon::parse($lastVacation?->to));

        $temp->setValue('period_from', $periodFrom);
        $temp->setValue('period_to', $periodTo);
        $temp->setValue('all_day', $allDay);
        $temp->setValue('to', $to);
        $temp->setValue('new_date', $newToDate);
        $temp->setValue('work_day', $newToDate);
        $temp->setValue('rest_day', $data['rest_day']);
        $temp->setValue('reason', CommandReasonTypeEnum::get($data['reason']));

        if ($command) {
            $jsonData['status'] = 'update';
            $jsonData['id'] = $lastVacation?->id;
            $jsonData['data'] = [
                'worker_id' => $workerPosition->worker_id,
                'worker_position_id' => $workerPosition->id,
                'organization_id' => $workerPosition->organization_id,
                'contract_id' => $workerPosition->contract_id,
                'to' => $data['new_date'],
                'work_day' => $data['new_date'],
                'rest_day' => $data['rest_day'],
                'command_id' => $command->id
            ];

            if ($data['reason'] !== 1) {
                $jsonData['data']['rest_day'] = (-1) * (int)$data['rest_day'];
            }

            $confirmations = $appendConfirmation($command->id, $workerPosition, $confirmations);
        }
    }

    public function handleFiftyType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        callable $appendConfirmation
    ): void {
        $temp->setValue('post_name', strtolower(PositionHelper::getShortPosition($workerPosition)));
        $temp->setValue('worker_full_name', $workerPosition->worker->full_name());
        $temp->setValue('worker_short_name', $workerPosition->worker->short_name());
        $lastVacation = Vacation::query()->find($data['vacation_id']);

        $to = Helper::getDateTex(Carbon::parse($data['to']));
        $workDay = Helper::getDateTex(Carbon::parse($data['work_day']));

        $temp->setValue('to', $to);
        if (($data['vacation_finish_status'] ?? null) === 2) {
            $temp->setValue('work_day', $workDay);
            $temp->setValue('child_age', $data['child_age']);
            $temp->setValue('codes', '9-, 405-moddalari');
            $temp->cloneBlock('variant1', 0, true, true);
            $temp->cloneBlock('variant2', 1, true, true);
        } else {
            $temp->setValue('vacation_new_date', $workDay);
            if ($data['vacation_status'] === 1) {
                $temp->setValue('vacation_work_status', 'toâ€˜liq');
                $temp->setValue('vacation_salary_status', 'toâ€˜lanadigan');
            } else {
                $temp->setValue('vacation_work_status', 'toâ€˜liqsiz');
                $temp->setValue('vacation_salary_status', 'saqlanmagan');
            }
            $temp->setValue('codes', '405-moddasi');
            $temp->cloneBlock('variant2', 0, true, true);
            $temp->cloneBlock('variant1', 1, true, true);
        }

        if ($command) {
            $jsonData['status'] = 'update';
            $jsonData['id'] = $lastVacation?->id;
            $jsonData['data'] = [
                'worker_id' => $workerPosition->worker_id,
                'worker_position_id' => $workerPosition->id,
                'organization_id' => $workerPosition->organization_id,
                'contract_id' => $workerPosition->contract_id,
                'to' => $data['to'],
                'work_day' => $data['work_day'],
                'command_id' => $command->id
            ];

            $confirmations = $appendConfirmation($command->id, $workerPosition, $confirmations);
        }
    }

    public function handleFortyEightType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        SingleWorkerVacationCommandHelper $helper,
        callable $appendConfirmation
    ): void {
        [$to, $from, $workDay] = $helper->applyStartDates($temp, $workerPosition, $data);
        $temp->setValue('all_day', $data['all_day']);
        $temp->setValue('to', $to);
        $temp->setValue('from', $from);
        $temp->setValue('work_day', $workDay);
        $temp->setValue('reason', CommandReasonTypeEnum::get($data['reason']));

        $confirmations = $helper->syncCreateCommandData(
            $command,
            $workerPosition,
            $data,
            $confirmations,
            $jsonData,
            $appendConfirmation
        );
    }

    public function handleFortySixType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        SingleWorkerVacationCommandHelper $helper,
        callable $appendConfirmation
    ): void {
        $periodFrom = Helper::getDateTex(Carbon::parse($data['period_from']));
        $periodTo = Helper::getDateTex(Carbon::parse($data['period_to']));
        [$to, $from, $workDay] = $helper->applyStartDates($temp, $workerPosition, $data);

        $temp->setValue('period_from', $periodFrom);
        $temp->setValue('period_to', $periodTo);
        $temp->setValue('all_day', $data['all_day']);
        $temp->setValue('from', $from);
        $temp->setValue('work_day', $workDay);
        $temp->setValue('half_one_day', $data['half_one_day']);

        if (array_key_exists('half_one_base', $data) && $data['half_two_day']) {
            $temp->setValue('half_two_day', $data['half_two_day']);
        } else {
            $temp->setValue('half_two_day', (int)$data['all_day'] - (int)$data['half_one_day']);
        }

        if ($data['half_two_base']) {
            $nextDate = Carbon::parse($data['half_two_date']);
            $month = Helper::getMonth($nextDate->month);
            $activeYear = Carbon::parse($data['from']);
            if ($activeYear->year === $nextDate->year) {
                $text = "joriy yilning {$month} oyiga";
            } elseif ($activeYear->year + 1 === $nextDate->year) {
                $text = "keyingi yilning {$month} oyiga";
            } else {
                $text = $nextDate->year . "-yilning {$month} oyiga";
            }
            $halfTwoBase = "xodimning xohishiga koâ€˜ra {$text} koâ€˜chirilsin";
        } else {
            $halfTwoBase = "xodimning xohishiga koâ€˜ra pullik kompensatsiya bilan almashtirilsin";
        }

        $temp->setValue('half_two_base', $halfTwoBase);

        $vacationAdditional = collect($data['additional'])
            ->map(fn($additional) => ucfirst(VacationAdditionalEnum::get($additional['id'])) . '-' . $additional['value'] . ' kun')
            ->implode(', ');

        if ($vacationAdditional) {
            $vacationAdditional = '(' . $vacationAdditional . ')';
        }

        $temp->setValue('additional', $vacationAdditional);
        $confirmations = $helper->syncCreateCommandData(
            $command,
            $workerPosition,
            $data,
            $confirmations,
            $jsonData,
            $appendConfirmation
        );
    }

    public function handleFortySevenType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        SingleWorkerVacationCommandHelper $helper,
        callable $appendConfirmation,
        callable $setAdditionalToCommand
    ): void {
        [$to, $from, $workDay] = $helper->applyStartDates($temp, $workerPosition, $data);
        $temp->setValue('reason', strtolower($data['vacation_reason_type']));
        $temp->setValue('all_day', $data['vacation_reason_day']);
        $temp->setValue('from_date', $from);
        $temp->setValue('work_day', $workDay);

        if (array_key_exists('base', $data) && $data['base']) {
            $temp->setValue('base', $data['base']);
        } else {
            $temp->setValue('base', $workerPosition->worker->short_name() . 'ning arizasi, bolalarning tugâ€˜ilganlik haqida guvohnoma nusxalari');
        }

        $setAdditionalToCommand($temp, $data);
        $confirmations = $helper->syncCreateCommandData(
            $command,
            $workerPosition,
            $data,
            $confirmations,
            $jsonData,
            $appendConfirmation
        );
    }

    public function handleFiftyOneType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        SingleWorkerVacationCommandHelper $helper,
        callable $appendConfirmation
    ): void {
        [$to, $from, $workDay] = $helper->applyStartDates($temp, $workerPosition, $data);
        $data['all_day'] = Carbon::parse($data['to'])->diffInDays(Carbon::parse($data['from']));
        $temp->setValue('all_day', $data['all_day']);
        $temp->setValue('to', $to);
        $temp->setValue('from', $from);
        $temp->setValue('work_day', $workDay);
        $temp->setValue('reason', $data['reason']);

        $confirmations = $helper->syncCreateCommandData(
            $command,
            $workerPosition,
            $data,
            $confirmations,
            $jsonData,
            $appendConfirmation
        );
    }

    public function handleFortyNineType(
        TemplateProcessor $temp,
        array $data,
        $command,
        $workerPosition,
        array &$confirmations,
        array &$jsonData,
        SingleWorkerVacationCommandHelper $helper,
        callable $appendConfirmation
    ): void {
        [$to, $from, $workDay] = $helper->applyStartDates($temp, $workerPosition, $data);
        $temp->setValue('to', $to);
        $temp->setValue('from', $from);
        $temp->setValue('work_day', $workDay);

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
                'to' => $data['to'],
                'work_day' => $data['work_day'],
            ];

            $confirmations = $appendConfirmation($command->id, $workerPosition, $confirmations);
        }
    }
}
