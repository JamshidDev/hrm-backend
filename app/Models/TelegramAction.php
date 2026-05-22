<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TelegramAction extends Model
{
    use  SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'request' => 'array'
    ];
}
