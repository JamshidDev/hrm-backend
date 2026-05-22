<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;

class ChatCategoriesNews extends Model
{
    protected $table = 'chat_categories_news';

    public $timestamps = false;

    protected $fillable = [
        'chat_news_category_id',
        'chat_news_id',
    ];

    protected $primaryKey = null;
    public $incrementing = false;
}
