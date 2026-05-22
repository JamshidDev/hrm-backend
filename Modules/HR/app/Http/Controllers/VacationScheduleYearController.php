<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\VacationSchedule\DocumentReplace;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\VacationSchedule;
use Modules\HR\Models\VacationScheduleYear;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\VacationSchedule\VacationScheduleYearResource;
use Modules\HR\Transformers\VacationSchedule\WorkersResource;

class VacationScheduleYearController extends Controller
{
    public function __construct(protected DocumentReplace $documentReplace)
    {
    }

    public function index(): JsonResponse
    {
        $data = VacationScheduleYear::query()
            ->with([
                'tradeUnion',
                'director',
                'creator.organization:id,name,name_en,name_ru,full_name',
                'creator.department:id,name,level',
                'creator.position:id,name',
                'creator.worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_en,name_ru'
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, VacationScheduleYearResource::class);
        return Helper::response(true, $data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'year' => 'required',
            'worker_position_ids' => 'required|array',
            'director_id' => 'required|integer',
            'trade_union_id' => 'required|integer',
            'creator_id' => 'required|integer',
            'date' => 'required|date'
        ]);
        $user = auth()->user();

        DB::transaction(function () use ($request, $user) {
            $vacationScheduleYear = VacationScheduleYear::query()
                ->updateOrCreate(
                    [
                        'year' => $request->year,
                        'organization_id' => $user->organization_id
                    ],
                    [
                        'director_id' => $request->director_id,
                        'trade_union_id' => $request->trade_union_id,
                        'creator_id' => $request->creator_id,
                        'user_id' => $user->id,
                        'date' => $request->date
                    ]
                );

            $data = [];
            $wps = collect($request->worker_position_ids);
            $wpData = $wps->keyBy('id');
            $workerPositions = WorkerPosition::query()
                ->whereIn('id', $wps->pluck('id')->toArray())
                ->with([
                    'department:id,name,level',
                    'position:id,name,name_ru,name_en'
                ])
                ->whereStatus(PositionStatusEnum::ACTIVE->value)
                ->get();

            $now = now()->toDateTimeString();
            foreach ($workerPositions as $worker_position) {
                $wp = $wpData[$worker_position->id];
                $month = (int)date('m', strtotime($wp['plan_date']));

                if (array_key_exists('period_from', $wp) &&
                    array_key_exists('period_to', $wp) &&
                    array_key_exists('plan_date', $wp) &&
                    $wp['period_from'] && $wp['period_to'] && $wp['plan_date']) {

                    $data[] = [
                        'organization_id' => $worker_position->organization_id,
                        'worker_position_id' => $worker_position->id,
                        'vacation_schedule_year_id' => $vacationScheduleYear->id,
                        'worker_id' => $worker_position->worker_id,
                        'table_number' => (int)($wp['table_number'] ?? 0),
                        'period_from' => $wp['period_from'],
                        'period_to' => $wp['period_to'],
                        'plan_date' => $wp['plan_date'],
                        'all_days' => $wp['all_days'] ?? 0,
                        'month' => $month,
                        'created_at' => $now,
                        'updated_at' => $now
                    ];
                }
            }
            if (count($data)) {
                $vacationScheduleYear->load([
                    'tradeUnion',
                    'director',
                    'creator'
                ]);
                $this->documentReplace->generate($vacationScheduleYear, $request->all());
                $updateColumns = [
                    'organization_id',
                    'worker_position_id',
                    'table_number',
                    'period_from',
                    'period_to',
                    'plan_date',
                    'all_days',
                    'month',
                    'updated_at',
                ];
                $uniqueBy = ['vacation_schedule_year_id', 'worker_id'];
                foreach (array_chunk($data, 200) as $chunk) {
                    VacationSchedule::upsert($chunk, $uniqueBy, $updateColumns);
                }
            }
        });

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function workers(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $vacationScheduleYearId = VacationScheduleYear::query()
            ->where('organization_id', $user->organization_id)
            ->where('year', request('year', now()->year))->value('id');

        $data = WorkerPosition::query()
            ->select(
                'id',
                'uuid',
                'position_id',
                'worker_id',
                'organization_id',
                'department_id',
                'contract_id'
            )
            ->filter($user, request()->all())
            ->search()
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->orderBy('id')
            ->paginate($per_page);

        $data->load([
            'department:id,name,level',
            'organization:id,name,name_en,name_ru,group',
            'position:id,name,name_ru,name_en',
            'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
            'contract:id,table_number',
            'vacationSchedule' => function ($query) use ($vacationScheduleYearId) {
                $query->where('vacation_schedule_year_id', $vacationScheduleYearId);
            },
            'lastVacation'
        ]);

        $positions = PaginateResource::make($data, WorkersResource::class);
        return Helper::response(true, $positions);
    }


    public function autoGenerate($vacationScheduleYearId): JsonResponse
    {
        $vacationScheduleYear = VacationScheduleYear::query()->findOrFail($vacationScheduleYearId);
        if (!$vacationScheduleYear) {
            return Helper::response(trans('messages.year_not_set'), [], 400);
        }
        $user = auth()->user();
        $data = WorkerPosition::query()
            ->select(
                'id',
                'worker_id',
                'organization_id',
                'department_id',
                'department_position_id'
            )
            ->filter($user, request()->all())
            ->search()
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->orderBy('id');

        $totalWorkers = (clone $data)->count();

        // minimal teng taqsimot
        $perMonthLimit = (int)ceil($totalWorkers / 12);

        $monthLoad = array_fill(1, 12, 0);

        $existingSchedules = VacationSchedule::query()
            ->where('vacation_schedule_year_id', $vacationScheduleYear->id)
            ->get();

        foreach ($existingSchedules as $schedule) {
            $month = Carbon::parse($schedule->from)->month;
            $monthLoad[$month]++;
        }

        $gData = [];

        $data = $data->with([
            'organization:id,name,name_en,name_ru,group',
            'vacationSchedule' => function ($query) use ($vacationScheduleYearId) {
                $query->where('vacation_schedule_year_id', $vacationScheduleYearId);
            },
            'lastVacation:id,worker_id,from,to'
        ])->paginate(request('per_page', 10));

        foreach ($data as $position) {
            $schedule = $position->vacationSchedule->first();
            if (!$schedule || !$schedule->plan_date) {
                $guessedDate = $this->findBalancedVacationDate(
                    $position,
                    $vacationScheduleYear,
                    $monthLoad,
                    $perMonthLimit
                )->format('Y-m-d');
            } else {
                $guessedDate = $schedule->plan_date;
            }
            $gData[] = [
                'id' => $position->id,
                'worker_id' => $position->worker_id,
                'plan_date' => $guessedDate,
            ];
        }

        return Helper::response(true, $gData);
    }

    private function findBalancedVacationDate($workerPosition, $vacationScheduleYear, array &$monthLoad, int $perMonthLimit)
    {
        $year = (int)$vacationScheduleYear->year;
        // default target — iyul
        $targetMonth = 7;

        if ($workerPosition->lastVacation) {
            $lastFrom = Carbon::parse($workerPosition->lastVacation->from);
            $targetMonth = $lastFrom->addMonths(10)->month; // 9–12 o‘rtachasi
        }

        // 12 oy bo‘ylab aylanamiz
        for ($i = 0; $i < 12; $i++) {
            $month = (($targetMonth + $i - 1) % 12) + 1;

            if ($monthLoad[$month] < $perMonthLimit) {
                $monthLoad[$month]++;

                return Carbon::create(
                    $year,
                    $month,
                    random_int(1, 28) // xavfsiz kun
                );
            }
        }

        // agar hammasi to‘lib ketgan bo‘lsa (kamdan-kam)
        return Carbon::create($year, 12, 28);
    }
}
