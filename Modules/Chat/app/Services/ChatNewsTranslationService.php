<?php

namespace Modules\Chat\Services;

use Modules\Chat\Models\ChatNewsTranslation;

class ChatNewsTranslationService
{
    public function create(array $data)
    {
        return ChatNewsTranslation::updateOrCreate(
            [
                'chat_news_id' => $data['chat_news_id'],
                'locale' => $data['locale']
            ],
            $data
        );
    }

    public function delete(ChatNewsTranslation $translation): void
    {
        $translation->delete();
    }
}
