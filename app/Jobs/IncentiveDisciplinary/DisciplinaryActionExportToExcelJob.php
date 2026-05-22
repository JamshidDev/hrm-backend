<?php

namespace App\Jobs\IncentiveDisciplinary;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\OrganizationDisciplinary;

class DisciplinaryActionExportToExcelJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected array $query;
    protected UserExportTask $task;
    protected User $user;

    public function __construct($query, $task, $user)
    {
        $this->query = $query;
        $this->task = $task;
        $this->user = $user;
    }

    public function handle(): void
    {
        request()->merge($this->query);
        try {
            $data = OrganizationDisciplinary::query()
                ->filter($this->user)
                ->with([
                    'worker_position:id,id,worker_id,organization_id,position_id,department_id,contract_id',
                    'worker_position.department:id,name,level',
                    'worker_position.position:id,name',
                    'worker_position.organization:id,name,name_en,name_ru,group,full_name',
                    'worker_position.worker:id,id,last_name,first_name,middle_name,birthday,photo',
                    'organization:id,name,name_en,name_ru,group'
                ])
                ->orderByDesc('id')
                ->get()
                ->map(function ($item) {
                    return [
                        'organization_name' => $item->organization?->name,
                        'position' => PositionHelper::getShortPosition($item->worker_position),
                        'date' => $item->date,
                        'fine' => $item->fine,
                        'fine_type' => $item->fine_type,
                        'reason' => $item->reason,
                        'number' => $item->number
                    ];
                });
            $fileName = 'tasks/export/disciplinary/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($data, 'worker', [
                'organization_name',
                'position',
                'date',
                'fine',
                'fine_type',
                'reason',
                'number',
            ]), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] IncentiveExportToExcelJob:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
