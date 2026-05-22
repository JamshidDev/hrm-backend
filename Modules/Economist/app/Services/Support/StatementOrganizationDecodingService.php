<?php

namespace Modules\Economist\Services\Support;

use App\Enums\ExportTaskEnum;
use App\Helpers\EconomistHelper;
use App\Jobs\Economist\StatementDecodingWithCodesJob;
use App\Models\UserExportTask;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\Organization;

class StatementOrganizationDecodingService
{
    public function __construct(
        private readonly StatementCodeDictionaryService $statementCodeDictionaryService,
    ) {
    }

    public function decode(array $filters, $user): array|string
    {
        $year = $filters['year'] ?? date('Y');
        $month = $filters['month'] ?? date('m');
        $plusCodes = array_flip(EconomistHelper::totalOneColumns());
        $minusOneCodes = array_flip(EconomistHelper::totalFourColumns());
        $minusTwoCodes = array_flip(EconomistHelper::totalTwoColumns());
        $holdCodes = array_flip(EconomistHelper::totalFiveColumns());
        $paymentTypes = $this->statementCodeDictionaryService->names();

        $selects = ['organizations.id', 'organizations.code', 'organizations.parent_id'];

        foreach ($paymentTypes as $code => $label) {
            if (config('app.env') === 'production') {
                $selects[] = DB::raw("SUM(total_sum) FILTER (WHERE statement_aggregates.code = '$code') AS \"$code\"");
                continue;
            }

            $selects[] = DB::raw(
                "COALESCE(SUM(CASE WHEN statement_aggregates.code = '$code' THEN statement_aggregates.total_sum ELSE 0 END), 0) as `$code`"
            );
        }

        $organizations = Organization::query()
            ->when($filters['organizations'] ?? null, function ($query, $organizations) {
                $query->whereIn('organizations.id', explode(',', $organizations));
            })
            ->leaderOrganizations($user)
            ->leftJoin('statement_aggregates', function ($join) use ($year, $month) {
                $join->on('organizations.id', '=', 'statement_aggregates.organization_id')
                    ->where('statement_aggregates.year', '=', $year)
                    ->where('statement_aggregates.month', '=', $month);
            })
            ->select($selects)
            ->groupBy('organizations.id', 'organizations.code', 'organizations.parent_id')
            ->orderBy('organizations.id')
            ->limit(15)
            ->get();

        $count = count($organizations);
        $plusList[] = $this->initHeaderRowOrganization($organizations);
        $plusList[] = $this->initEmptyRowOrganization(trans('messages.economist.statement.decoding.one'), $organizations);
        $minusOneList[] = $this->initEmptyRowOrganization(trans('messages.economist.statement.decoding.two'), $organizations);
        $minusTwoList[] = $this->initEmptyRowOrganization(trans('messages.economist.statement.decoding.eight'), $organizations);
        $holdList[] = $this->initEmptyRowOrganization(trans('messages.economist.statement.decoding.three'), $organizations);

        $sums = [
            'plus' => array_fill(1, $count + 4, 0),
            'minus_one' => array_fill(1, $count + 4, 0),
            'minus_two' => array_fill(1, $count + 4, 0),
            'hold' => array_fill(1, $count + 4, 0),
        ];

        foreach ($paymentTypes as $code => $name) {
            $rowData = ['type_name' => $name, 'type_code' => $code];
            $total = 0;
            $organizationValues = [];

            foreach ($organizations as $organization) {
                $value = $organization->{$code} ?? 0;
                $rowData[$organization->id] = number_format($value, 2, '.', ' ');
                $organizationValues[$organization->id] = $value;
                $total += $value;
            }

            $rowData['total_year'] = number_format($total, 2, '.', ' ');

            if (isset($plusCodes[$code])) {
                $plusList[] = $rowData;
                $this->addToSums($sums['plus'], $organizationValues, $total);
            } elseif (isset($minusOneCodes[$code])) {
                $minusOneList[] = $rowData;
                $this->addToSums($sums['minus_one'], $organizationValues, $total);
            } elseif (isset($minusTwoCodes[$code])) {
                $minusTwoList[] = $rowData;
                $this->addToSums($sums['minus_two'], $organizationValues, $total);
            } elseif (isset($holdCodes[$code])) {
                $holdList[] = $rowData;
                $this->addToSums($sums['hold'], $organizationValues, $total);
            }
        }

        $plusList = $this->appendOrganizationSummaryRow($sums['plus'], $plusList, $organizations);
        $minusOneList = $this->appendOrganizationSummaryRow($sums['minus_one'], $minusOneList, $organizations);
        $minusTwoList = $this->appendOrganizationSummaryRow($sums['minus_two'], $minusTwoList, $organizations);
        $holdList = $this->appendOrganizationSummaryRow($sums['hold'], $holdList, $organizations);

        $minusList = array_merge(
            $minusOneList,
            $minusTwoList,
            [
                $this->createCombinedTotalMinusRowOrganization($sums['minus_one'], $sums['minus_two'], $organizations),
                $this->createCombinedTotalRowOrganization($sums['plus'], $sums['minus_one'], $sums['minus_two'], $organizations),
            ]
        );

        $result = array_merge($plusList, $minusList, $holdList);

        if (array_key_exists('download', $filters)) {
            $task = UserExportTask::query()->create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::STATEMENTS_WITH_ORGANIZATIONS->value,
            ]);

            StatementDecodingWithCodesJob::dispatch($task, $result);

            return trans('messages.successfully_exported');
        }

        return $result;
    }

    private function initHeaderRowOrganization($organizations): array
    {
        $row['type_name'] = trans('messages.economist.statement.decoding.four');
        $row['type_code'] = trans('messages.economist.statement.decoding.five');

        foreach ($organizations as $organization) {
            $row[$organization->id] = $organization->code;
        }

        $row['total_year'] = trans('messages.economist.statement.decoding.six');

        return $row;
    }

    private function initEmptyRowOrganization(string $typeName, $organizations): array
    {
        $row['type_name'] = $typeName;
        $row['type_code'] = ' ';

        foreach ($organizations as $organization) {
            $row[$organization->id] = ' ';
        }

        $row['total_year'] = ' ';

        return $row;
    }

    private function appendOrganizationSummaryRow(array $sums, array $list, $organizations): array
    {
        $row['type_name'] = trans('messages.economist.statement.decoding.six');
        $row['type_code'] = ' ';

        foreach ($organizations as $organization) {
            $row[$organization->id] = number_format($sums[$organization->id] ?? 0, 2, '.', ' ');
        }

        $row['total_year'] = number_format($sums['total_year'] ?? 0, 2, '.', ' ');
        $list[] = $row;

        return $list;
    }

    private function createCombinedTotalMinusRowOrganization(array $minusOneSums, array $minusTwoSums, $organizations): array
    {
        $row['type_name'] = trans('messages.economist.statement.decoding.seven');
        $row['type_code'] = ' ';

        foreach ($organizations as $organization) {
            $row[$organization->id] = number_format(
                ($minusOneSums[$organization->id] ?? 0) + ($minusTwoSums[$organization->id] ?? 0),
                2,
                '.',
                ' '
            );
        }

        $row['total_year'] = number_format(($minusOneSums['total_year'] ?? 0) + ($minusTwoSums['total_year'] ?? 0), 2, '.', ' ');

        return $row;
    }

    private function createCombinedTotalRowOrganization(array $plusSums, array $minusOneSums, array $minusTwoSums, $organizations): array
    {
        $row['type_name'] = trans('messages.economist.statement.decoding.nine');
        $row['type_code'] = ' ';

        foreach ($organizations as $organization) {
            $row[$organization->id] = number_format(
                ($plusSums[$organization->id] ?? 0) + ($minusOneSums[$organization->id] ?? 0) + ($minusTwoSums[$organization->id] ?? 0),
                2,
                '.',
                ' '
            );
        }

        $row['total_year'] = number_format(
            ($plusSums['total_year'] ?? 0) + ($minusOneSums['total_year'] ?? 0) + ($minusTwoSums['total_year'] ?? 0),
            2,
            '.',
            ' '
        );

        return $row;
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
}
