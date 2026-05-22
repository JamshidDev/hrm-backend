<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\MedDTO;
use Modules\HR\Models\Med;

class MedService
{
    use Base64FileUploadTrait;

    public function list($filters, $user)
    {
        return Med::query()
            ->search()
            ->whereHas('worker.positions', fn($q) => $q->filter($user, $filters))
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_en,name_ru,group',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_en,name_ru,group',
                'worker_position.position:id,name',
                'worker.currentVacation:id,worker_id,to',
            ])
            ->when($filters['status'] ?? null, function ($q) use ($filters) {
                $q->where('status', (int)$filters['status']);
            })
            ->when($filters['departments'] ?? null, function ($q) use ($filters) {
                $q->whereHas('worker_position',
                    fn($q) => $q->whereIn('department_id', explode(',', $filters['departments'])));
            })
            ->whereCurrent(true)
            ->orderBy('to')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function store(MedDTO $dto): void
    {
        DB::transaction(function () use ($dto) {

            $data = [
                'worker_id' => $dto->workerId,
                'from' => $dto->from,
                'to' => $dto->to,
                'status' => $dto->status,
                'comment' => $dto->comment,
                'user_id' => $dto->userId,
                'organization_id' => $dto->organizationId,
                'deleted_at' => null,
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-meds'
                );
            }

            Med::withTrashed()
                ->updateOrCreate([
                    'worker_id' => $dto->workerId,
                    'from' => $dto->from,
                ],
                    $data
                );
        });
    }

    public function update(Med $med, MedDTO $dto): void
    {
        DB::transaction(function () use ($med, $dto) {

            if ($dto->file) {
                $med->file = $this->uploadFormFile(
                    $dto->file,
                    'worker-meds'
                );
            }

            Med::withTrashed()
                ->where('worker_id', $med->worker_id)
                ->whereDate('from', $dto->from)
                ->where('id', '!=', $med->id)
                ->forceDelete();

            $med->update([
                'from' => $dto->from,
                'to' => $dto->to,
                'status' => $dto->status,
                'comment' => $dto->comment,
            ]);
        });
    }

    public function delete(Med $med): void
    {
        $med->delete();
    }
}
