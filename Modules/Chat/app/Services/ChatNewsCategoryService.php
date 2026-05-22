<?php

namespace Modules\Chat\Services;

use Modules\Chat\Models\ChatNewsCategory;

class ChatNewsCategoryService
{
    public function create(array $data)
    {
        return ChatNewsCategory::create($data);
    }

    public function update(ChatNewsCategory $category, array $data): ChatNewsCategory
    {
        $category->update($data);
        return $category;
    }

    public function delete(ChatNewsCategory $category): void
    {
        $category->delete();
    }
}
