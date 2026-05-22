<?php

namespace Modules\Chat\Transformers\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatNewsListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'categories' => ChatNewsCategoryResource::collection($this->categories),
            'created_at' => $this->created_at->toDateTimeString(),
            'slug' => $this->slug,
            'status' => $this->status,
            'published_at' => $this->published_at,
            'is_pinned' => $this->is_pinned,
            'views_count' => $this->views_count,
            'likes_count' => $this->likes_count,
            'is_viewed' => $this->is_viewed,
            'has_liked' => $this->has_liked,
            'has_disliked' => $this->has_disliked,
            'dislikes_count' => $this->dislikes_count,
            'comments_count' => $this->comments_count,
            'translations' => ChatNewsTranslationsResource::collection($this->translations),
            'media' => ChatNewsMediaResource::collection($this->media)
        ];
    }
}
