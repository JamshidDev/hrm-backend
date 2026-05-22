<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;

class ChatNewsView extends Model
{
    protected $guarded = ['id'];



    protected $table = 'chat_news_views';
}
