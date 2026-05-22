<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;

class ChatNewsLike extends Model
{
    protected $guarded = ['id'];

    protected $table = 'chat_news_likes';
}
