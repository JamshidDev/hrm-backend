<?php

namespace App\Jobs\HR;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\Pensioner;

class PensionersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected array $query;
    protected User $user;

    public function __construct($task, $query, $user)
    {
        $this->task = $task;
        $this->query = $query;
        $this->user = $user;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);
            $data = Pensioner::query()
                ->filter($this->user)
                ->when(request('organizations'), function ($query, $organizations) {
                    $query->whereIn('organization_id', explode(',', $organizations));
                })
                ->with(['organization:id,name,name_en,name_ru,group,full_name',])
                ->search()
                ->get()
                ->map(function ($item) {
                    return [
                        'last_name' => $item->last_name,
                        'first_name' => $item->first_name,
                        'middle_name' => $item->middle_name,
                        'sex' => $item->sex ? trans('messages.worker.man') : trans('messages.worker.woman'),
                        'organization' => $item->organization->name,
                        'position' => $item->position,
                        'pin' => $item->pin,
                        'address' => $item->address,
                        'passport' => $item->passport,
                        'work_experience' => $item->experience,
                        'year' => $item->year,
                        'phone' => $item->phone,
                        'afghan' => $item->afghan,
                        'invalid' => $item->invalid,
                        'chernobyl' => $item->chernobyl,
                        'railway_title' => $item->railway_title,
                    ];
                })->values()->toArray();

            $fileName = 'tasks/export/pensioners/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($data, 'worker'), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            Helper::setLog($e, 'Pensioners export failed:');
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $e->getMessage()]);
        }
    }
}
