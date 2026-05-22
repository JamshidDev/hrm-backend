<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class ChatNewsCategory extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $table = 'chat_news_categories';

    protected $casts = [
        'name' => 'array',
    ];
}
