<?php

namespace Modules\Economist\Services\Support;

use Illuminate\Database\Eloquent\Builder;
use Modules\Economist\Models\Statement;

class StatementQueryService
{
    public function paginate(array $filters, $user)
    {
        $sortBy = $filters['sort_by'] ?? 'id';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        return $this->baseQuery($filters, $user)
            ->select([
                'id',
                'organization_id',
                'worker_id',
                'main_salary',
                'work_time',
                'full_name',
                'position',
                'pin',
                'year',
                'month',
                'total_one',
                'total_two',
                'total_three',
                'total_four',
                'total_five',
            ])
            ->with(['worker:id,last_name,first_name,middle_name,photo'])
            ->orderBy($sortBy, $sortOrder)
            ->paginate($filters['per_page'] ?? 10);
    }

    public function count(array $filters, $user): int
    {
        return $this->baseQuery($filters, $user)->count();
    }

    public function byPin(string $pin, array $filters, $user)
    {
        return Statement::query()
            ->with('organization:id,name,full_name')
            ->filter($user, $filters)
            ->where('pin', $pin)
            ->where('year', $filters['year'] ?? date('Y'))
            ->where('month', $filters['month'] ?? date('m'))
            ->get();
    }

    private function baseQuery(array $filters, $user): Builder
    {
        return Statement::query()
            ->filter($user, $filters)
            ->where('year', $filters['year'] ?? date('Y'))
            ->where('month', $filters['month'] ?? date('m'))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->whereHas('worker', function ($workerQuery) {
                            $workerQuery->searchByFullName();
                        })
                        ->orWhereLike('full_name', '%' . $search . '%')
                        ->orWhereLike('pin', '%' . $search . '%');
                });
            })
            ->when($filters['code'] ?? null, function ($query, $code) {
                $query->where('s_' . $code, '>', 0);
            })
            ->when($filters['start_hours'] ?? null, function ($query, $startHours) {
                $query->where('work_time', '>=', $startHours);
            })
            ->when($filters['end_hours'] ?? null, function ($query, $endHours) {
                $query->where('work_time', '<=', $endHours);
            })
            ->when(array_key_exists('status', $filters), function ($query) {
                $query->whereNull('worker_id');
            });
    }
}
