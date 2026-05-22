<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;

class TurnstileWorkerAccessLevel extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $primaryKey = null;
    public $incrementing = false;
}
