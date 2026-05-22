<?php

namespace Modules\Economist\Models;

use App\Helpers\EconomistHelper;
use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class StatementAggregate extends Model
{
    protected $guarded = ['id'];

    protected $table = 'statement_aggregates';

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeLastMonthsTotal(Builder $query, $user, $periods): array
    {
        $codeGroups = [
            'total_one'   => array_map('intval', EconomistHelper::totalOneColumns()),
            'total_two'   => array_map('intval', EconomistHelper::totalTwoColumns()),
            'total_three' => array_map('intval', EconomistHelper::totalThreeColumns()),
            'total_five'  => array_map('intval', EconomistHelper::totalFiveColumns()),
        ];

        $selects = [
            'year',
            'month',
            DB::raw('SUM(CASE WHEN code IN (' . implode(',', array_map(fn($c) => "'$c'", $codeGroups['total_one'])) . ') THEN total_sum ELSE 0 END) as total_one'),
            DB::raw('SUM(CASE WHEN code IN (' . implode(',', array_map(fn($c) => "'$c'", $codeGroups['total_two'])) . ') THEN total_sum ELSE 0 END) as total_two'),
            DB::raw('SUM(CASE WHEN code IN (' . implode(',', array_map(fn($c) => "'$c'", $codeGroups['total_three'])) . ') THEN total_sum ELSE 0 END) as total_three'),
            DB::raw('SUM(CASE WHEN code IN (' . implode(',', array_map(fn($c) => "'$c'", $codeGroups['total_five'])) . ') THEN total_sum ELSE 0 END) as total_five'),
        ];

        $labels = $periods->pluck('label');

        $results = $query
            ->select($selects)
            ->filter($user, request()->all())
            ->whereIn(DB::raw("TO_CHAR(year, 'FM0000') || '-' || TO_CHAR(month, 'FM00')"), $labels)
            ->groupBy('year', 'month')
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get()
            ->mapWithKeys(function ($row) {
                $key = sprintf('%04d-%02d', $row->year, $row->month);
                return [
                    $key => [
                        'total_one'   => (int) $row->total_one,
                        'total_two'   => (int) $row->total_two,
                        'total_three' => (int) $row->total_three,
                        'total_four'  => (int) $row->total_one + (int) $row->total_three,
                        'total_five'  => (int) $row->total_five,
                    ]
                ];
            });

        $data = [];
        foreach ($periods as $period) {
            $data[] = [
                'label'  => $period['label'],
                'amount' => $results[$period['label']] ?? null
            ];
        }

        return $data;
    }
}
