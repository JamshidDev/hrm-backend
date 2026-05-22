<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TerminalLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'event_time' => $this->event_time,
            'event_type' => $this->event_type,
            'status' => 'in-work'
        ];
    }
}
