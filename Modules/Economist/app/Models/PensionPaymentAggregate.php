<?php

namespace Modules\Economist\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PensionPaymentAggregate extends Model
{
    use SoftDeletes;

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeLastMonthsTotal(Builder $query, $user, $periods): array
    {
        $columns = [
            'income_tax_paid',
            'total_contributions'
        ];

        $query->filter($user, request()->all())
            ->where(function ($q) use ($periods) {
                foreach ($periods as $p) {
                    $q->orWhere(function ($sub) use ($p) {
                        $sub->where('year', $p['year'])
                            ->where('month', $p['month']);
                    });
                }
            })
            ->whereIn('column', $columns);

        $results = $query
            ->selectRaw('"year", "month", "column", SUM(total_sum) as total')
            ->groupBy('year', 'month', 'column')
            ->get()
            ->groupBy(fn ($row) => sprintf('%04d-%02d', $row->year, $row->month));

        $data = [];

        foreach ($periods as $period) {
            $label = $period['label'];
            $items = $results->get($label, collect());

            $totals = [];

            foreach ($columns as $col) {
                $totals[$col] = (float) $items->firstWhere('column', $col)?->total ?? 0;
            }

            $data[] = [
                'label'  => $label,
                'amount' => $items->isNotEmpty() ? $totals : null,
            ];
        }

        return $data;
    }
}
