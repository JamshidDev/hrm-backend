<?php

namespace Modules\HR\Http\Controllers\Exports;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Jobs\HR\WorkerRelativesExportJob;
use App\Jobs\HR\WorkersExportToExcelJob;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkerExportController extends Controller
{
    public function columns(): JsonResponse
    {
        $columns = [
            [
                'column' => 'organization_name',
                'label' => trans('messages.worker.organization_name'),
            ],
            [
                'column' => 'last_name',
                'label' => trans('messages.worker.last_name'),
            ],
            [
                'column' => 'first_name',
                'label' => trans('messages.worker.first_name'),
            ],
            [
                'column' => 'middle_name',
                'label' => trans('messages.worker.middle_name'),
            ],
            [
                'column' => 'full_name',
                'label' => trans('messages.worker.full_name'),
            ],
            [
                'column' => 'birthday',
                'label' => trans('messages.worker.birthday'),
            ],
            [
                'column' => 'sex',
                'label' => trans('messages.worker.sex'),
            ],
            [
                'column' => 'country',
                'label' => trans('messages.worker.country'),
            ],
            [
                'column' => 'region',
                'label' => trans('messages.worker.region'),
            ],
            [
                'column' => 'city',
                'label' => trans('messages.worker.city'),
            ],
            [
                'column' => 'current_region',
                'label' => trans('messages.worker.current_region'),
            ],
            [
                'column' => 'current_city',
                'label' => trans('messages.worker.current_city'),
            ],
            [
                'column' => 'address',
                'label' => trans('messages.worker.address'),
            ],
            [
                'column' => 'nationality',
                'label' => trans('messages.worker.nationality'),
            ],
            [
                'column' => 'phones',
                'label' => trans('messages.worker.phones'),
            ],
            [
                'column' => 'pin',
                'label' => trans('messages.worker.pin'),
            ],
            [
                'column' => 'marital',
                'label' => trans('messages.worker.marital'),
            ],
            [
                'column' => 'work_experience',
                'label' => trans('messages.worker.work_experience'),
            ],
            [
                'column' => 'experience_date',
                'label' => trans('messages.worker.experience_date'),
            ],
            [
                'column' => 'education',
                'label' => trans('messages.worker.education'),
            ],
            [
                'column' => 'universities',
                'label' => trans('messages.worker.universities'),
            ],
            [
                'column' => 'specialities',
                'label' => trans('messages.worker.specialities'),
            ],
            [
                'column' => 'med_from',
                'label' => trans('messages.worker.med_from'),
            ],
            [
                'column' => 'med_to',
                'label' => trans('messages.worker.med_to'),
            ],
            [
                'column' => 'med_status',
                'label' => trans('messages.worker.med_status'),
            ],
            [
                'column' => 'organization',
                'label' => trans('messages.worker.organization'),
            ],
            [
                'column' => 'department',
                'label' => trans('messages.worker.department'),
            ],
            [
                'column' => 'position',
                'label' => trans('messages.worker.position'),
            ],
            [
                'column' => 'full_position',
                'label' => trans('messages.worker.full_position'),
            ],
            [
                'column' => 'short_position',
                'label' => trans('messages.worker.short_position'),
            ],
            [
                'column' => 'group',
                'label' => trans('messages.worker.group'),
            ],
            [
                'column' => 'rank',
                'label' => trans('messages.worker.rank'),
            ],
            [
                'column' => 'rate',
                'label' => trans('messages.worker.rate'),
            ],
            [
                'column' => 'position_date',
                'label' => trans('messages.worker.position_date'),
            ],
            [
                'column' => 'position_experience',
                'label' => trans('messages.worker.position_experience'),
            ],
            [
                'column' => 'type',
                'label' => trans('messages.worker.type'),
            ],
            [
                'column' => 'contract',
                'label' => trans('messages.worker.contract'),
            ],
            [
                'column' => 'contract_date',
                'label' => trans('messages.worker.contract_date'),
            ],
            [
                'column' => 'passport_serial_number',
                'label' => trans('messages.worker.passport_serial_number'),
            ],
            [
                'column' => 'passport_from_date',
                'label' => trans('messages.worker.passport_from_date'),
            ],
            [
                'column' => 'passport_to_date',
                'label' => trans('messages.worker.passport_to_date'),
            ],
            [
                'column' => 'passport_address',
                'label' => trans('messages.worker.passport_address'),
            ]
        ];

        return Helper::response(true, $columns);
    }

    public function export(Request $request): JsonResponse
    {

        $columns = $request->columns;
        $query = (array)$request->all()['query'];
        $userId = auth()->user()->id;

        $task = UserExportTask::create([
            'user_id' => $userId,
            'type' => ExportTaskEnum::WORKERS->value,
        ]);

        WorkersExportToExcelJob::dispatch($columns, $task, $query, $userId);
        return Helper::response(trans('messages.successfully_exported'));
    }


    public function exportRelatives(Request $request): JsonResponse
    {
        $query = $request->all();
        $user = auth()->user();
        $task = UserExportTask::create([
            'user_id' => $user->id,
            'type' => ExportTaskEnum::RELATIVES->value,
        ]);
        WorkerRelativesExportJob::dispatch($query, $task, $user);
        return Helper::response(trans('messages.successfully_exported'));
    }

}
