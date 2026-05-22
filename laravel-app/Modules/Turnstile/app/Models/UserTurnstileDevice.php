<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;

class UserTurnstileDevice extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'hik_central_device_id',
        'user_id',
    ];

    protected $primaryKey = null;
    public $incrementing = false;
}
