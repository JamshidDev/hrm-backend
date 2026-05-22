<?php

namespace Modules\Chat\Transformers\Notifications;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data' => $this->data,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at->toDateTimeString()
        ];
    }
}
