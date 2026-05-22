<?php

namespace Modules\Chat\Services;

use Modules\Chat\Models\ChatNews;
use Modules\Chat\Models\ChatNewsView;

class ChatNewsViewService
{
    public function view($newsId, $userId): void
    {
        $news = ChatNews::query()->findOrFail($newsId);
        $view =  ChatNewsView::firstOrCreate([
            'chat_news_id' => $news->id,
            'user_id' => $userId
        ]);

        if ($view->wasRecentlyCreated) {
            $news->increment('views_count');
        }
    }
}
