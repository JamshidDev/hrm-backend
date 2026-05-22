<?php

namespace Modules\Chat\Transformers\Notifications;

use App\Http\Resources\User\UserWorkerResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationsListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new UserWorkerResource($this->notifiable),
            'data' => $this->data,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at->toDateTimeString()
        ];
    }
}
