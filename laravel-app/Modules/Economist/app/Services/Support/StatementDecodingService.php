<?php

namespace Modules\Economist\Services\Support;

use App\Enums\ExportTaskEnum;
use App\Helpers\EconomistHelper;
use App\Helpers\Helper;
use App\Jobs\Economist\StatementDecodingWithCodesJob;
use App\Models\UserExportTask;
use Modules\Economist\Models\StatementAggregate;

class StatementDecodingService
{
    public function __construct(
        private readonly StatementCodeDictionaryService $statementCodeDictionaryService,
    ) {
    }

    public function decode(array $filters, $user): array|string
    {
        $year = $filters['year'] ?? date('Y');
        $plusCodes = array_flip(EconomistHelper::totalOneColumns());
        $minusOneCodes = array_flip(EconomistHelper::totalFourColumns());
        $minusTwoCodes = array_flip(EconomistHelper::totalTwoColumns());
        $holdCodes = array_flip(EconomistHelper::totalFiveColumns());

        $plusList = $this->initHeaderRow($year);
        $plusList[] = $this->initEmptyMonthRow();
        $plusList[] = $this->initEmptyRow(trans('messages.economist.statement.decoding.one'));
        $minusOneList = [$this->initEmptyRow(trans('messages.economist.statement.decoding.two'))];
        $minusTwoList = [$this->initEmptyRow(trans('messages.economist.statement.decoding.eight'))];
        $holdList = [$this->initEmptyRow(trans('messages.economist.statement.decoding.three'))];

        $sums = [
            'plus' => array_fill(1, 13, 0),
            'minus_one' => array_fill(1, 13, 0),
            'minus_two' => array_fill(1, 13, 0),
            'hold' => array_fill(1, 13, 0),
        ];

        $paymentTypes = $this->statementCodeDictionaryService->names();
        $select = $this->buildMonthlySelect($paymentTypes);

        $monthlyData = StatementAggregate::query()
            ->selectRaw($select)
            ->filter($user, $filters)
            ->where('year', $year)
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month')
            ->toArray();

        foreach ($paymentTypes as $code => $name) {
            $rowData = ['type_name' => $name, 'type_code' => $code];
            $total = 0;
            $monthlyValues = [];

            for ($month = 1; $month <= 12; $month++) {
                $column = 's_' . $code;
                $value = round($monthlyData[$month][$column] ?? 0, 2);
                $rowData[$month] = number_format($value, 2, '.', ' ');
                $monthlyValues[$month] = $value;
                $total += $value;
            }

            $rowData['total_year'] = number_format($total, 2, '.', ' ');

            if (isset($plusCodes[$code])) {
                $plusList[] = $rowData;
                $this->addToSums($sums['plus'], $monthlyValues, $total);
            } elseif (isset($minusOneCodes[$code])) {
                $minusOneList[] = $rowData;
                $this->addToSums($sums['minus_one'], $monthlyValues, $total);
            } elseif (isset($minusTwoCodes[$code])) {
                $minusTwoList[] = $rowData;
                $this->addToSums($sums['minus_two'], $monthlyValues, $total);
            } elseif (isset($holdCodes[$code])) {
                $holdList[] = $rowData;
                $this->addToSums($sums['hold'], $monthlyValues, $total);
            }
        }

        $plusList = $this->appendSummaryRow($sums['plus'], $plusList);
        $minusOneList = $this->appendSummaryRow($sums['minus_one'], $minusOneList);
        $minusTwoList = $this->appendSummaryRow($sums['minus_two'], $minusTwoList);
        $holdList = $this->appendSummaryRow($sums['hold'], $holdList);
        $minusTwoList[] = $this->createCombinedMinusTotalRow($sums['minus_one'], $sums['minus_two']);
        $minusTwoList[] = $this->createCombinedTotalRow($sums['plus'], $sums['minus_one'], $sums['minus_two']);

        $result = array_merge($plusList, $minusOneList, $minusTwoList, $holdList);

        if (array_key_exists('download', $filters)) {
            $task = UserExportTask::query()->create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::STATEMENTS_WITH_CODES->value,
            ]);

            StatementDecodingWithCodesJob::dispatch($task, $result);

            return trans('messages.successfully_exported');
        }

        return $result;
    }

    private function buildMonthlySelect(array $paymentTypes): string
    {
        $aggregates = collect($paymentTypes)->keys()
            ->map(function ($code) {
                $column = 's_' . $code;

                if (config('app.env') === 'production') {
                    return "SUM(total_sum) FILTER (WHERE code = '$code') AS $column";
                }

                return "SUM(CASE WHEN code = '$code' THEN total_sum ELSE 0 END) AS $column";
            })
            ->implode(', ');

        return 'month, ' . $aggregates;
    }

    private function initHeaderRow(string $year): array
    {
        return [[
            'type_name' => trans('messages.economist.statement.decoding.four'),
            'type_code' => trans('messages.economist.statement.decoding.five'),
            '1' => $year,
            '2' => ' ',
            '3' => ' ',
            '4' => ' ',
            '5' => ' ',
            '6' => ' ',
            '7' => ' ',
            '8' => ' ',
            '9' => ' ',
            '10' => ' ',
            '11' => ' ',
            '12' => ' ',
            'total_year' => trans('messages.economist.statement.decoding.in_year'),
        ]];
    }

    private function initEmptyRow(string $typeName): array
    {
        return [
            'type_name' => $typeName,
            'type_code' => ' ',
            '1' => ' ',
            '2' => ' ',
            '3' => ' ',
            '4' => ' ',
            '5' => ' ',
            '6' => ' ',
            '7' => ' ',
            '8' => ' ',
            '9' => ' ',
            '10' => ' ',
            '11' => ' ',
            '12' => ' ',
            'total_year' => ' ',
        ];
    }

    private function initEmptyMonthRow(): array
    {
        return [
            'type_name' => '',
            'type_code' => ' ',
            '1' => Helper::getMonth(1),
            '2' => Helper::getMonth(2),
            '3' => Helper::getMonth(3),
            '4' => Helper::getMonth(4),
            '5' => Helper::getMonth(5),
            '6' => Helper::getMonth(6),
            '7' => Helper::getMonth(7),
            '8' => Helper::getMonth(8),
            '9' => Helper::getMonth(9),
            '10' => Helper::getMonth(10),
            '11' => Helper::getMonth(11),
            '12' => Helper::getMonth(12),
            'total_year' => ' ',
        ];
    }

    private function addToSums(array &$sumArray, array $values, float $total): void
    {
        foreach ($values as $key => $value) {
            if (!array_key_exists($key, $sumArray)) {
                $sumArray[$key] = 0;
            }

            $sumArray[$key] += $value;
        }

        if (!array_key_exists('total_year', $sumArray)) {
            $sumArray['total_year'] = 0;
        }

        $sumArray['total_year'] += $total;
    }

    private function appendSummaryRow(array $sums, array $list): array
    {
        $list[] = [
            'type_name' => trans('messages.economist.statement.decoding.six'),
            'type_code' => ' ',
            '1' => number_format($sums[1], 2, '.', ' '),
            '2' => number_format($sums[2], 2, '.', ' '),
            '3' => number_format($sums[3], 2, '.', ' '),
            '4' => number_format($sums[4], 2, '.', ' '),
            '5' => number_format($sums[5], 2, '.', ' '),
            '6' => number_format($sums[6], 2, '.', ' '),
            '7' => number_format($sums[7], 2, '.', ' '),
            '8' => number_format($sums[8], 2, '.', ' '),
            '9' => number_format($sums[9], 2, '.', ' '),
            '10' => number_format($sums[10], 2, '.', ' '),
            '11' => number_format($sums[11], 2, '.', ' '),
            '12' => number_format($sums[12], 2, '.', ' '),
            'total_year' => number_format($sums['total_year'] ?? 0, 2, '.', ' '),
        ];

        return $list;
    }

    private function createCombinedMinusTotalRow(array $minusOneSums, array $minusTwoSums): array
    {
        return [
            'type_name' => trans('messages.economist.statement.decoding.seven'),
            'type_code' => ' ',
            '1' => number_format(($minusOneSums[1] ?? 0) + ($minusTwoSums[1] ?? 0), 2, '.', ' '),
            '2' => number_format(($minusOneSums[2] ?? 0) + ($minusTwoSums[2] ?? 0), 2, '.', ' '),
            '3' => number_format(($minusOneSums[3] ?? 0) + ($minusTwoSums[3] ?? 0), 2, '.', ' '),
            '4' => number_format(($minusOneSums[4] ?? 0) + ($minusTwoSums[4] ?? 0), 2, '.', ' '),
            '5' => number_format(($minusOneSums[5] ?? 0) + ($minusTwoSums[5] ?? 0), 2, '.', ' '),
            '6' => number_format(($minusOneSums[6] ?? 0) + ($minusTwoSums[6] ?? 0), 2, '.', ' '),
            '7' => number_format(($minusOneSums[7] ?? 0) + ($minusTwoSums[7] ?? 0), 2, '.', ' '),
            '8' => number_format(($minusOneSums[8] ?? 0) + ($minusTwoSums[8] ?? 0), 2, '.', ' '),
            '9' => number_format(($minusOneSums[9] ?? 0) + ($minusTwoSums[9] ?? 0), 2, '.', ' '),
            '10' => number_format(($minusOneSums[10] ?? 0) + ($minusTwoSums[10] ?? 0), 2, '.', ' '),
            '11' => number_format(($minusOneSums[11] ?? 0) + ($minusTwoSums[11] ?? 0), 2, '.', ' '),
            '12' => number_format(($minusOneSums[12] ?? 0) + ($minusTwoSums[12] ?? 0), 2, '.', ' '),
            'total_year' => number_format(($minusOneSums['total_year'] ?? 0) + ($minusTwoSums['total_year'] ?? 0), 2, '.', ' '),
        ];
    }

    private function createCombinedTotalRow(array $plusSums, array $minusOneSums, array $minusTwoSums): array
    {
        return [
            'type_name' => trans('messages.economist.statement.decoding.nine'),
            'type_code' => ' ',
            '1' => number_format(($plusSums[1] ?? 0) + ($minusOneSums[1] ?? 0) + ($minusTwoSums[1] ?? 0), 2, '.', ' '),
            '2' => number_format(($plusSums[2] ?? 0) + ($minusOneSums[2] ?? 0) + ($minusTwoSums[2] ?? 0), 2, '.', ' '),
            '3' => number_format(($plusSums[3] ?? 0) + ($minusOneSums[3] ?? 0) + ($minusTwoSums[3] ?? 0), 2, '.', ' '),
            '4' => number_format(($plusSums[4] ?? 0) + ($minusOneSums[4] ?? 0) + ($minusTwoSums[4] ?? 0), 2, '.', ' '),
            '5' => number_format(($plusSums[5] ?? 0) + ($minusOneSums[5] ?? 0) + ($minusTwoSums[5] ?? 0), 2, '.', ' '),
            '6' => number_format(($plusSums[6] ?? 0) + ($minusOneSums[6] ?? 0) + ($minusTwoSums[6] ?? 0), 2, '.', ' '),
            '7' => number_format(($plusSums[7] ?? 0) + ($minusOneSums[7] ?? 0) + ($minusTwoSums[7] ?? 0), 2, '.', ' '),
            '8' => number_format(($plusSums[8] ?? 0) + ($minusOneSums[8] ?? 0) + ($minusTwoSums[8] ?? 0), 2, '.', ' '),
            '9' => number_format(($plusSums[9] ?? 0) + ($minusOneSums[9] ?? 0) + ($minusTwoSums[9] ?? 0), 2, '.', ' '),
            '10' => number_format(($plusSums[10] ?? 0) + ($minusOneSums[10] ?? 0) + ($minusTwoSums[10] ?? 0), 2, '.', ' '),
            '11' => number_format(($plusSums[11] ?? 0) + ($minusOneSums[11] ?? 0) + ($minusTwoSums[11] ?? 0), 2, '.', ' '),
            '12' => number_format(($plusSums[12] ?? 0) + ($minusOneSums[12] ?? 0) + ($minusTwoSums[12] ?? 0), 2, '.', ' '),
            'total_year' => number_format(($plusSums['total_year'] ?? 0) + ($minusOneSums['total_year'] ?? 0) + ($minusTwoSums['total_year'] ?? 0), 2, '.', ' '),
        ];
    }
}
