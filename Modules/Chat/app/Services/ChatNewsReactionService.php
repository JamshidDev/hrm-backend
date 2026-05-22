<?php

namespace Modules\Chat\Services;

use Modules\Chat\Models\ChatNews;
use Modules\Chat\Models\ChatNewsLike;

class ChatNewsReactionService
{
    public function react($newsId, int $reaction, $userId): void
    {
        $news = ChatNews::query()->findOrFail($newsId);

        $existing = ChatNewsLike::where([
            'chat_news_id' => $news->id,
            'user_id' => auth()->id()
        ])->first();

        if (!$existing) {
            ChatNewsLike::create([
                'chat_news_id' => $news->id,
                'user_id' => auth()->id(),
                'reaction' => $reaction
            ]);

            $this->updateCounters($news, null, $reaction);

        } else if ($existing->reaction !== $reaction) {
            $this->updateCounters($news, $existing->reaction, $reaction);
            $existing->update(['reaction' => $reaction]);
        }
    }

    private function updateCounters($news, $old, $new): void
    {
        if ($old === 1) {
            $news->decrement('likes_count');
        }
        if ($old === -1) {
            $news->decrement('dislikes_count');
        }

        if ($new === 1) {
            $news->increment('likes_count');
        }
        if ($new === -1) {
            $news->increment('dislikes_count');
        }
    }
}
