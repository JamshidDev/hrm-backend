<?php

namespace Modules\HR\Transformers\Worker\University;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\University\SpecialityResource;
use Modules\Structure\Transformers\University\UniversityResource;

class WorkerUniversityResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'speciality' => new SpecialityResource($this->speciality),
            'university' => new UniversityResource($this->university),
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'file' => Helper::fileUrl($this->file),
        ];
    }
}
