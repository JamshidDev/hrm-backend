<?php

namespace Modules\Economist\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\Structure\Models\Organization;

class Statement extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'data' => 'array',
    ];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function scopeLastMonthsTotal(Builder $query, $user, $periods): array
    {
        $query->where(function ($q) use ($periods) {
            foreach ($periods as $p) {
                $q->orWhere(function ($sub) use ($p) {
                    $sub->where('year', $p['year'])
                        ->where('month', $p['month']);
                });
            }
        });

        $columns = ['total_one', 'total_two', 'total_three', 'total_four', 'total_five'];
        $selects = collect($columns)
            ->map(fn($col) => "SUM($col) as $col")
            ->prepend('year')
            ->prepend('month')
            ->implode(', ');

        $results = $query
            ->selectRaw($selects)
            ->groupBy('year', 'month')
            ->get()
            ->mapWithKeys(function ($row) use ($columns) {
                $key = sprintf('%04d-%02d', $row->year, $row->month);

                $totals = [];
                foreach ($columns as $col) {
                    $totals[$col] = (int)($row->{$col} ?? 0);
                }

                return [$key => $totals];
            });

        $data = [];
        foreach ($periods as $period) {
            $data[] = [
                'label' => $period['label'],
                'amount' => $results[$period['label']] ?? null
            ];
        }
        return $data;
    }


}
