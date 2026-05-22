<?php

namespace Modules\Chat\Transformers\Chat;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatNewsMediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'path' => Helper::fileUrl($this->path),
            'size' => $this->size,
            'extension' => $this->extension,
            'order' => $this->order,
        ];
    }
}
