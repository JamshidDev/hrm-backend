<?php

namespace Modules\HR\Transformers\Dashboard;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerMedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'photo' => Helper::fileUrl($this->photo),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'to' => $this->to,
            'position_name' => PositionHelper::getShortPosition($this->position)
        ];
    }
}
