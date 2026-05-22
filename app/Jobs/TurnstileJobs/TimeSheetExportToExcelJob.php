<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\TimesheetExport;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Holiday;
use Modules\Structure\Models\Organization;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;

class TimeSheetExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;

    protected User $user;
    protected array $query;

    public function __construct($task, $query, $user)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);
            $user = $this->user;
            $orgId = request('organization_id', $user->organization_id);
            $organization = Organization::leaderOrganizations($user)->find($orgId)->full_name;
            $date = Carbon::parse(request('year') . '-' . request('month'));
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();

            $holidays = Holiday::whereBetween('holiday_date', [$start, $end])->pluck('holiday_date')->toArray();
            $workers = WorkerPosition::query()
                ->filter($user, $this->query)
                ->where('organization_id', $orgId)
                ->when(request('departments'), function ($q) {
                    $q->whereIn('department_id', explode(',', request('departments')));
                })
                ->with('vacation', function ($q) use ($start) {
                    $q->where('from', '>=', $start->format('Y-m-d'));
                })
                ->select('id',
                    'worker_id',
                    'position_id',
                    'department_id',
                    'organization_id',
                    'turnstile_schedule_type_id',
                    'is_turnstile',
                    'turnstile_privilege_start_minute',
                    'turnstile_privilege_end_minute'
                )
                ->with('scheduleDays', function ($q) use ($start, $end) {
                    $q->selectRaw("
                        id,
                        turnstile_schedule_group_id,
                        worker_position_id,
                        worker_id,
                        date,
                        work_status,
                        to_char(turnstile_worker_schedules.start_time, 'HH24:MI') as start_time,
                        to_char(turnstile_worker_schedules.end_time, 'HH24:MI') as end_time,
                        daily_minutes,
                        daytime,
                        evening_time,
                        fact_daily_minutes,
                        fact_daytime,
                        fact_evening_time
                ")->whereBetween('date', [$start->format('Y-m-d'), $end->format('Y-m-d')]);
                })
                ->with([
                    'organization:id,name,name_ru,name_en,group',
                    'position:id,name',
                    'department:id,name,level',
                    'worker:id,last_name,first_name,middle_name,birthday,photo',
                    'contract:id,table_number'
                ]);

            if ($user->hasOrganizationRoles($user->organization_id, ['TimesheetHR'])) {
                $workers->whereIn('department_id',
                    TimeSheetWorkerDepartment::query()
                        ->where('worker_id', $user->worker_id)
                        ->select('department_id')
                );
            }

            $workers = $workers
                ->orderBy('organization_id')
                ->orderBy('department_id')
                ->orderBy('department_position_id')
                ->get()
                ->groupBy('department_id');

            $data = [];
            foreach ($workers as $departmentId => $items) {
                $ws = [];
                foreach ($items as $item) {
                    $schedules = [];
                    $halfMonth = [
                        'day' => 0,
                        'day_hours' => 0,
                        'evening_hours' => 0,
                    ];
                    $fullMonth = [
                        'day' => 0,
                        'day_hours' => 0,
                        'evening_hours' => 0,
                        'vacation_day' => 0,
                        'holiday_day' => 0,
                        'holiday_work_day' => 0,
                        'week_day' => 0
                    ];
                    $vDays = [];

                    if ($item->vacation) {
                        $startVacation = Carbon::parse($item->vacation->from_date);
                        if ($item->vacation->from_date < $start->format('Y-m-d')) {
                            $startVacation = $start;
                        }

                        if ($item->vacation->to_date >= $end->format('Y-m-d')) {
                            $endVacation = $end;
                        } else {
                            $endVacation = Carbon::parse($item->vacation->to_date);
                        }

                        for ($j = $startVacation->copy(); $j->lt($endVacation); $j = $j->addDay()) {
                            $vDays[] = $j->format('Y-m-d');
                            $schedules[$j->format('Y-m-d')]['day'] = $j->day;
                            $schedules[$j->format('Y-m-d')]['statuses'][] = [
                                'status' => 14,
                                'hours' => '',
                            ];

                            ++$fullMonth['vacation_day'];
                        }
                    }

                    for ($i = $start->clone(); $i->lt($end->clone()); $i = $i->addDay()) {
                        if (in_array($i->format('Y-m-d'), $holidays, true)) {
                            ++$fullMonth['holiday_day'];

                        }
                        if (!in_array($i->format('Y-m-d'), $vDays, true)) {
                            $dDate = $i;
                            $schedule = $item->scheduleDays->where('date', $dDate->format('Y-m-d'))->first();
                            if ($schedule) {
                                $schedules[$dDate->format('Y-m-d')]['day'] = $dDate->day;
                                if ($schedule->work_status) {
                                    $daytime = round($schedule->daytime / 60);
                                    $eveningTime = round($schedule->evening_time / 60);
                                    if ($daytime) {
                                        $schedules[$schedule->date]['statuses'][] = [
                                            'status' => 1,
                                            'hours' => $daytime,
                                        ];
                                    }
                                    if ($eveningTime) {
                                        $schedules[$schedule->date]['statuses'][] = [
                                            'status' => 2,
                                            'hours' => $eveningTime,
                                        ];
                                    }
                                    if ($daytime || $eveningTime) {
                                        if ($dDate->day <= 15) {
                                            ++$halfMonth['day'];
                                            $halfMonth['day_hours'] += $daytime;
                                            $halfMonth['evening_hours'] += $eveningTime;
                                        }
                                        ++$fullMonth['holiday_work_day'];
                                        ++$fullMonth['day'];
                                        $fullMonth['day_hours'] += $daytime;
                                        $fullMonth['evening_hours'] += $eveningTime;
                                    }
                                } else {
                                    $schedules[$schedule->date]['statuses'][] = [
                                        'status' => 33,
                                        'hours' => '',
                                    ];
                                    ++$fullMonth['week_day'];
                                }
                            }
                        }
                    }

                    $ws[] = [
                        'full_name' => $item->worker->full_name(),
                        'organization' => $item->organization?->name,
                        'department' => $item->department?->name,
                        'position' => $item->position?->name,
                        'halfMonth' => $halfMonth,
                        'fullMonth' => $fullMonth,
                        'days' => collect($schedules)->values()->toArray(),
                    ];
                }
                $data[] = [
                    'department_id' => $departmentId,
                    'department_name' => $items->first()?->department?->name,
                    'workers' => $ws
                ];
            }

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new TimesheetExport($data, $date->year, $date->month, $organization), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
