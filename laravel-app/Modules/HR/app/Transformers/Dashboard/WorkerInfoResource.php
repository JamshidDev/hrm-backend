<?php

namespace Modules\HR\Transformers\Dashboard;

use App\Helpers\Helper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerInfoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'uuid'        => $this->uuid,
            'photo'       => Helper::fileUrl($this->photo),
            'last_name'   => $this->last_name,
            'first_name'  => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday'    => $this->birthday,
            'education' => $this->education,
            'age'         => (int)abs(now()->diffInYears(Carbon::parse($this->birthday)))
        ];
    }
}
