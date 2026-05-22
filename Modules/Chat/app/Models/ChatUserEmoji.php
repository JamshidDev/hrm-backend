<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatUserEmoji extends Model
{
    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $guarded = ['id'];
}
