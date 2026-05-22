<?php

namespace Modules\Vacancy\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Vacancy\Enums\VacancySendStatusEnum;
use Modules\HR\Transformers\Vacancy\VacanciesResource;

class VacancyApplicationListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'vacancy_position' => new VacanciesResource($this->vacancy_position) ?? null,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'number' => 'URV' . Helper::pad_number($this->id, 8),
            'status' => [
                'id' => $this->status,
                'name' => VacancySendStatusEnum::get($this->status)
            ],
            'files' => $this->whenLoaded('files')->map(function ($files) {
                return [
                    'id' => $files->id,
                    'type' => $files->file_type,
                    'file_name' => $files->file_name,
                    'file' => Helper::fileUrl($files->file)
                ];
            }),
        ];
    }
}
