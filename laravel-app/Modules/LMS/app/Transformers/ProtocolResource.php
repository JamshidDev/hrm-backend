<?php

namespace Modules\LMS\Transformers;

use App\Helpers\Helper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProtocolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'protocol_date' => $this->protocol_date,
            'number' => $this->getNumber(),
            'cert_from' => $this->cert_from,
            'cert_to' => $this->cert_to
        ];
    }

    private function getNumber(): string
    {
        $date = Carbon::parse($this->protocol_date);
        $number = Helper::pad_number($this->number, 3);
        return $date->format('Y') . $number;
    }
}
