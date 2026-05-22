<?php

namespace Modules\HR\Transformers\Vacancy;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Vacancy\Enums\VacancyFileTypesEnum;

class VacancyApplicationFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'file_type' => [
                'id' => $this->file_type,
                'name' => VacancyFileTypesEnum::get($this->file_type)
            ],
            'file' => Helper::fileUrl($this->file)
        ];
    }
}
