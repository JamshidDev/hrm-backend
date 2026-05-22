<?php

namespace Modules\HR\Transformers\Dashboard;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PassportResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'serial_number' => $this->serial_number,
            'from_date' => $this->from_date,
            'to_date' => $this->to_date
        ];
    }
}
