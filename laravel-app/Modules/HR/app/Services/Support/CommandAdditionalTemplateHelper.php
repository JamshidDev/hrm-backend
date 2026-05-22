<?php

namespace Modules\HR\Services\Support;

use App\Helpers\Helper;
use Carbon\Carbon;
use PhpOffice\PhpWord\TemplateProcessor;

class CommandAdditionalTemplateHelper
{
    private const array TERMINATION_TYPES = [31, 32, 33, 34, 35, 36, 37, 38, 39];
    private const array REASON_CODE_TYPES = [34, 39];

    public function apply(TemplateProcessor $temp, array $data): void
    {
        $additional = $data['command_additional'] ?? null;

        if (in_array($data['command_type'], self::TERMINATION_TYPES, true)) {
            $this->applyTerminationDetails($temp, $additional);
        }

        if (in_array($data['command_type'], self::REASON_CODE_TYPES, true)) {
            $this->applyReasonCode($temp, $additional);
        }

        if (array_key_exists('base', $additional ?? [])) {
            $temp->setValue('base', $additional['base']);
        }
    }

    private function applyTerminationDetails(TemplateProcessor $temp, ?array $additional): void
    {
        $temp->setValue('codes', "172\u{2011}moddasiga");

        $this->applyPensionBlock($temp, $additional);
        $this->applySalaryOrCompensationBlock($temp, $additional);
        $this->applyOptionalDate($temp, 'warning_date', $additional);
        $this->applyOptionalDate($temp, 'med_date', $additional);
        $this->applyOptionalValue($temp, 'warning_number', $additional);
        $this->applyOptionalValue($temp, 'med_number', $additional);

        if (array_key_exists('reason', $additional ?? [])) {
            $temp->setValue('reason', strtolower($additional['reason']));
        }
    }

    private function applyPensionBlock(TemplateProcessor $temp, ?array $additional): void
    {
        if (!empty($additional['pension_count'])) {
            $data = $additional['pension_count'];
            $temp->setValue('year', $data['year']);
            $temp->setValue('count', "lavozim maoshining {$data['count']} barobari miqdorida");
            $temp->cloneBlock('pension_count', 1, true, true);
            return;
        }

        if (!empty($additional['pension_coefficient'])) {
            $data = $additional['pension_coefficient'];
            $temp->setValue('year', $data['year']);
            $temp->setValue('count', "lavozim maoshining {$data['count']} foizi miqdorida");
            $temp->setValue('codes', "172,269\u{2011}moddalariga");
            $temp->cloneBlock('pension_count', 1, true, true);
            return;
        }

        $temp->cloneBlock('pension_count', 0, true, true);
    }

    private function applySalaryOrCompensationBlock(TemplateProcessor $temp, ?array $additional): void
    {
        if (!empty($additional['salary_withholding'])) {
            $data = $additional['salary_withholding'];
            $temp->setValue('withholding_per1', Helper::getDateTex(Carbon::parse($data['period1'])));
            $temp->setValue('withholding_per2', Helper::getDateTex(Carbon::parse($data['period2'])));
            $temp->setValue('withholding_all_day', $data['all_day']);
            $temp->setValue('withholding_rest_day', $data['rest_day']);
            $temp->setValue('withholding_month', Helper::getMonth($data['month']));
            $temp->setValue('codes', "172,234\u{2011}moddalariga");
            $temp->cloneBlock('compensation', 0, true, true);
            $temp->cloneBlock('salary_withholding', 1, true, true);
            return;
        }

        if (!empty($additional['compensation'])) {
            $data = $additional['compensation'];
            $temp->setValue('compensation_per1', Helper::getDateTex(Carbon::parse($data['period1'])));
            $temp->setValue('compensation_per2', Helper::getDateTex(Carbon::parse($data['period2'])));
            $temp->setValue('compensation_all_day', $data['rest_day']);
            $temp->setValue('codes', "172,234\u{2011}moddalariga");
            $temp->cloneBlock('salary_withholding', 0, true, true);
            $temp->cloneBlock('compensation', 1, true, true);
            return;
        }

        $temp->cloneBlock('compensation', 0, true, true);
        $temp->cloneBlock('salary_withholding', 0, true, true);
    }

    private function applyReasonCode(TemplateProcessor $temp, ?array $additional): void
    {
        if (!empty($additional['reasonId'])) {
            $temp->setValue('reasonCode', '161-moddasi 2-qismi ' . $additional['reasonId'] . '-bandiga asosan');
            return;
        }

        $temp->setValue('reasonCode', '161-moddasi 2-qismiga asosan');
    }

    private function applyOptionalDate(TemplateProcessor $temp, string $key, ?array $additional): void
    {
        if (!array_key_exists($key, $additional ?? [])) {
            return;
        }

        $temp->setValue(
            $key,
            $additional[$key] ? Helper::getDateTex(Carbon::parse($additional[$key])) : ''
        );
    }

    private function applyOptionalValue(TemplateProcessor $temp, string $key, ?array $additional): void
    {
        if (!array_key_exists($key, $additional ?? [])) {
            return;
        }

        $temp->setValue($key, $additional[$key]);
    }
}
