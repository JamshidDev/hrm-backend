<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatNewsMedia extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $table = 'chat_news_media';
}
