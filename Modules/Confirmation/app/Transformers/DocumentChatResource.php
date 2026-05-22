<?php

namespace Modules\Confirmation\Transformers;

use App\Http\Resources\User\UserLittleResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentChatResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sender' => new UserLittleResource($this->sender),
            'recipient' => new UserLittleResource($this->recipient),
            'message' => $this->message,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at
        ];
    }
}
