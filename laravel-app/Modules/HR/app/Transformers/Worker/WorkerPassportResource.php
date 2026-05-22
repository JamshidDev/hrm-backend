<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\CityResource;
use Modules\Structure\Transformers\Structure\LanguageResource;
use Modules\Structure\Transformers\Structure\RegionResource;

class WorkerPassportResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'serial_number' => $this->serial_number,
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'address' => $this->address,
            'file' => Helper::fileUrl($this->file)
        ];
    }
}
