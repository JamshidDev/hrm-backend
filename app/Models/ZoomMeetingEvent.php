<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ZoomMeetingEvent extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'details' => 'array',
    ];
}
