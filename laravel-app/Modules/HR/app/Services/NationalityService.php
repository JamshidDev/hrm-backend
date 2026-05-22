<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\NationalityDTO;
use Modules\HR\Models\Nationality;

class NationalityService
{
    use Base64FileUploadTrait;

    public function store(NationalityDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $data = ['name' => $dto->name];
            Nationality::create($data);
        });
    }

    public function update(Nationality $nationality, NationalityDTO $dto): void
    {
        DB::transaction(function () use ($nationality, $dto) {
            $data = ['type' => $dto->type];
            $nationality->update($data);
        });
    }

    public function delete(Nationality $nationality): void
    {
        $nationality->delete();
    }
}
