<?php

namespace Modules\Chat\Transformers\Telegram;

use App\Enums\TelegramMessageTypeEnum;
use App\Http\Resources\User\UserWorkerResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TelegramMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new UserWorkerResource($this->user),
            'type' => [
                'id' => $this->type,
                'name' => TelegramMessageTypeEnum::tryFrom($this->type)?->label()
            ],
            'created_at' => $this->created_at->toDateTimeString(),
            'message' => $this->message,
            'status' => $this->status,
            'error' => $this->error
        ];
    }
}
