<?php

namespace Modules\Chat\Transformers\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatNewsTranslationsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'locale' => $this->locale,
            'title' => $this->title,
            'short_description' => $this->short_description,
            'content' => $this->content
        ];
    }
}
