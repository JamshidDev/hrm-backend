<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Turnstile\Enums\SyncTypeEnum;

class SyncAccessLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {

        return [
            'id' => $this->id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'sync_events_count' => $this->events_count,
            'status' => $this->status,
            'error' => $this->error,
            'day' => $this->day,
            'user' => new \App\Http\Resources\User\UserWorkerResource($this->user),
            'type' => [
                'id' => $this->type,
                'name' => SyncTypeEnum::get($this->type)
            ]
        ];
    }
}
