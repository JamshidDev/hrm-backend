<?php

namespace Modules\HR\Services;

use Modules\HR\DTO\OrganizationLeaderDTO;
use Modules\HR\Models\OrganizationLeader;

class OrganizationLeaderService
{
    public function paginate($filters, $user)
    {
        return OrganizationLeader::query()
            ->filter($user, $filters)
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker_position' => function ($q) {
                    $q->select(
                        'id',
                        'worker_id',
                        'position_id',
                        'department_id',
                        'organization_id'
                    )->with([
                        'worker:id,last_name,first_name,middle_name,birthday,photo',
                        'position:id,name',
                        'department:id,name',
                        'organization:id,full_name',
                    ]);
                },
            ])
            ->paginate($filters['per_page'] ?? 10);
    }

    public function store(OrganizationLeaderDTO $dto): void
    {
        OrganizationLeader::updateOrCreate(
            ['worker_position_id' => $dto->workerPositionId],
            [
                'organization_id' => $dto->organizationId,
                'phones' => $dto->phones,
            ]
        );
    }

    public function update(OrganizationLeader $leader, array $data): void
    {
        $leader->update($data);
    }

    public function delete(OrganizationLeader $leader): void
    {
        $leader->delete();
    }
}
