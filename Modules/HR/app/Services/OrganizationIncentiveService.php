<?php

namespace Modules\HR\Services;

use App\Enums\ExportTaskEnum;
use App\Jobs\IncentiveDisciplinary\IncentiveExportToExcelJob;
use App\Models\UserExportTask;
use Modules\HR\Models\OrganizationIncentive;

class OrganizationIncentiveService
{
    public function list(array $filters, $user)
    {
        if (!empty($filters['download'])) {
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::INCENTIVE->value,
            ]);

            IncentiveExportToExcelJob::dispatch($filters, $task, $user);
            return null;
        }

        return OrganizationIncentive::query()
            ->filter($user, $filters)
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->with([
                'worker_position:id,id,worker_id,organization_id,position_id,department_id,contract_id',
                'worker_position.department:id,name,level',
                'worker_position.position:id,name',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
                'worker_position.worker:id,id,last_name,first_name,middle_name,birthday,photo',
                'organization:id,name,name_en,name_ru,group'
            ])
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);
    }
}
