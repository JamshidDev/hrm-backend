<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\AcademicDegreeEnum;

class WorkerAcademicDegreeResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => [
                'id' => $this->type,
                'name' => AcademicDegreeEnum::get($this->type)
            ],
            'file' => Helper::fileUrl($this->file)
        ];
    }
}
