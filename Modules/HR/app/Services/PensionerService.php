<?php

namespace Modules\HR\Services;

use App\Enums\ExportTaskEnum;
use App\Jobs\HR\PensionersExportToExcelJob;
use App\Models\UserExportTask;
use Modules\HR\DTO\PensionerDTO;
use Modules\HR\Models\Pensioner;

class PensionerService
{
    public function paginate(array $filters, $user)
    {
        if (!empty($filters['export'])) {
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::PENSIONERS->value,
            ]);

            PensionersExportToExcelJob::dispatch($task, $filters, $user);
            return null;
        }

        return Pensioner::query()
            ->filter($user, $filters)
            ->search()
            ->with('organization:id,name,name_en,name_ru,group,full_name')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function listMed(array $filters)
    {
        return Pensioner::query()
            ->when($filters['organizations'] ?? null,
                fn ($q, $ids) => $q->whereIn('organization_id', explode(',', $ids)))
            ->search()
            ->with('organization:id,name,name_en,name_ru,group,full_name')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function store(PensionerDTO $dto): void
    {
        Pensioner::create([
            'last_name' => $dto->lastName,
            'first_name' => $dto->firstName,
            'middle_name' => $dto->middleName,
            'sex' => $dto->sex,
            'position' => $dto->position,
            'address' => $dto->address,
            'pin' => $dto->pin,
            'passport' => $dto->passport,
            'experience' => $dto->experience,
            'year' => $dto->year,
            'phone' => $dto->phone,
            'afghan' => $dto->afghan,
            'invalid' => $dto->invalid,
            'chernobyl' => $dto->chernobyl,
            'railway_title' => $dto->railwayTitle,
            'organization_id' => $dto->organizationId,
        ]);
    }

    public function update(Pensioner $pensioner, array $data): void
    {
        $pensioner->update($data);
    }

    public function delete(Pensioner $pensioner): void
    {
        $pensioner->delete();
    }
}
