<?php

namespace App\Jobs\HR;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Models\Vacation;
use Throwable;

class VacationWorkersExportJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected array $query;

    protected UserExportTask $task;

    protected int $userId;

    public function __construct($query, $task, $userId)
    {
        $this->query = $query;
        $this->task = $task;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        $user = User::find($this->userId);
        request()->merge($this->query);
        try {
            $data = Vacation::query()
                ->filter($user, $this->query)
                ->with([
                    'command:id,command_number,command_date,type',
                    'worker_position.worker:id,first_name,last_name,middle_name,uuid,photo',
                    'worker_position.department:id,name,level',
                    'worker_position.position:id,name',
                    'worker_position.organization:id,name,name_en,name_ru,group,full_name',
                ])
                ->when(request('vacation_type'), function ($query, $vacation_type) {
                    $query->whereIn('type', VacationTypeEnum::getVacationKey((int)$vacation_type));
                })
                ->orderByDesc('id')
                ->get()->map(function ($item) {
                    $workerPosition = $item->worker_position;
                    $worker = $workerPosition->worker;
                    return [
                        'id'   => $item->id,
                        'last_name' => $worker?->last_name,
                        'first_name' => $worker?->first_name,
                        'middle_name' => $worker?->middle_name,
                        'position' => PositionHelper::getFullPosition($workerPosition),
                        'command_number' => $item->command?->command_number,
                        'command_date' => $item->command?->command_date,
                        'type' => VacationTypeEnum::get($item->type, null),
                        'period_from'        => $item->period_from,
                        'period_to'          => $item->period_to,
                        'from'               => $item->from,
                        'to'                 => $item->to,
                    ];
                })->toArray();

            $fileName = 'tasks/export/vacations/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($data, 'worker'), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);
        } catch (Throwable $e) {
            Helper::setLog($e,'Vacation workers export failed:');
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
