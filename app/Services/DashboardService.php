<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Worker;

class DashboardService
{
    public static function birthdays(User $user): array
    {
        $today = Carbon::today();
        $lastDay = $today->copy()->addDays(4);

        $fromMonth = $today->month;
        $fromDay = $today->day;
        $toMonth = $lastDay->month;
        $toDay = $lastDay->day;

        $baseQuery = Worker::query()
            ->whereHas('positions', function ($query) use ($user) {
                $query->filter($user, request()->all());
            })
            ->select(
                'id',
                'last_name',
                'first_name',
                'middle_name',
                'birthday',
                'photo',
                'birth_day',
                'birth_month'
            );

        // Agar oraliq bitta oy ichida bo‘lsa:
        if ($fromMonth === $toMonth) {
            $workers = $baseQuery
                ->where('birth_month', $fromMonth)
                ->whereBetween('birth_day', [$fromDay, $toDay])
                ->orderBy('birth_month')
                ->orderBy('birth_day')
                ->get();
        } else {
            // 2 oyga o‘tib ketgan holatda
            $workers = $baseQuery
                ->where(function ($query) use ($fromMonth, $fromDay, $toMonth, $toDay) {
                    $query->where(function ($q) use ($fromMonth, $fromDay) {
                        $q->where('birth_month', $fromMonth)->where('birth_day', '>=', $fromDay);
                    })->orWhere(function ($q) use ($toMonth, $toDay) {
                        $q->where('birth_month', $toMonth)->where('birth_day', '<=', $toDay);
                    });
                })->orderBy('birth_month')->orderBy('birth_day')->get();
        }

        if ($workers->isEmpty()) {
            $allDays = collect([]);
        } else {
            $allDays = $workers->groupBy(
                fn($worker) => str_pad($worker->birth_month, 2, '0', STR_PAD_LEFT) . '-' . str_pad(
                        $worker->birth_day,
                        2,
                        '0',
                        STR_PAD_LEFT
                    )
            );
        }

        if ($allDays->isEmpty()) {
            return [
                'result' => [],
                'all_workers' => 0,
                'between' => [
                    'to' => $today->format('Y-m-d'),
                    'from' => $lastDay->format('Y-m-d'),
                ],
            ];
        }

        $period = CarbonPeriod::create($today, $lastDay);
        $allDates = collect($period)->map(fn($date) => $date->format('m-d'));
        $allDays = $allDates->mapWithKeys(fn($day) => [$day => $allDays[$day] ?? collect()]);

        $result = [];
        $filteredWorkerCount = 0;

        foreach ($allDays as $day => $workers) {
            $result[] = [
                'day' => $day,
                'workers' => $workers->take(3)->map(function ($worker) {
                    return [
                        'id' => $worker->id,
                        'last_name' => $worker->last_name,
                        'first_name' => $worker->first_name,
                        'middle_name' => $worker->middle_name,
                        'photo' => Helper::fileUrl($worker->photo),
                        'birthday' => $worker->birthday,
                    ];
                }),
                'count' => $workers->count(),
                'has_more' => max(0, $workers->count() - 3),
            ];
            $filteredWorkerCount += $workers->count();
        }

        return [
            'result' => $result,
            'all_workers' => $filteredWorkerCount,
            'between' => [
                'to' => $today->format('Y-m-d'),
                'from' => $lastDay->format('Y-m-d'),
            ],
        ];
    }

    public static function workersFilter($user, $currentDate)
    {
        $currentDate = $currentDate->format('Y-m-d');
        $plus30 = now()->addDays(30)->format('Y-m-d');
        return Worker::query()
            ->whereHas('positions', function ($query) use ($user) {
                $query->filter($user, request()->all());
            })
            ->selectRaw('COUNT(DISTINCT workers.id) as workers_count')
            ->selectRaw('COUNT(DISTINCT CASE WHEN sex = true THEN workers.id ELSE NULL END) as mans_count')
            ->selectRaw('COUNT(DISTINCT CASE WHEN sex = false THEN workers.id ELSE NULL END) as woman_count')
            ->selectRaw("
                COUNT(DISTINCT CASE
                    WHEN workers.birthday >= CURRENT_DATE - INTERVAL '30 years'
                    THEN workers.id END) as age_30_and_younger
                ")
            ->selectRaw("
                COUNT(DISTINCT CASE
                    WHEN workers.birthday < CURRENT_DATE - INTERVAL '30 years'
                     AND workers.birthday >= CURRENT_DATE - INTERVAL '45 years'
                    THEN workers.id END) as age_31_to_45
                ")
            ->selectRaw("
                COUNT(DISTINCT CASE
                    WHEN workers.birthday < CURRENT_DATE - INTERVAL '45 years'
                    THEN workers.id END) as age_46_and_older
                ")
            ->leftJoinSub(
                DB::table('worker_passports')
                    ->select('id', 'worker_id', 'to_date')
                    ->where('current', true)
                    ->orderBy('worker_id')
                    ->orderByDesc('id')
                    ->distinct('worker_id'),
                'p',
                'p.worker_id',
                '=',
                'workers.id'
            )
            ->selectRaw("COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.to_date <= DATE '$plus30' AND p.to_date > DATE '$currentDate' THEN workers.id ELSE NULL END) as passports_count")
            ->selectRaw("COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.to_date <= DATE '$currentDate' THEN workers.id ELSE NULL END) as passports_more_count")
            ->selectRaw("SUM(CASE WHEN workers.sex = true AND workers.birthday <= DATE '$currentDate' - INTERVAL '60 years' THEN 1 ELSE 0 END) as retired_men_count")
            ->selectRaw("SUM(CASE WHEN workers.sex = false AND workers.birthday <= DATE '$currentDate' - INTERVAL '55 years' THEN 1 ELSE 0 END) as retired_women_count")
            ->selectRaw('COUNT(DISTINCT CASE WHEN education = 1 THEN workers.id ELSE NULL END) as higher_edu_count')
            ->selectRaw('COUNT(DISTINCT CASE WHEN education = 2 THEN workers.id ELSE NULL END) as special_edu_count')
            ->selectRaw('COUNT(DISTINCT CASE WHEN education = 3 THEN workers.id ELSE NULL END) as middle_edu_count')
            ->first();
    }

}
