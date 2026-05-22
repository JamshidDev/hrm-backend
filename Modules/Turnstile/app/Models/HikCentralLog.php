<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;

class HikCentralLog extends Model
{
    protected $connection = 'hcp_db';

    protected $table = 'access_log';

    public $timestamps = false;

    protected $guarded = [];

    protected $primaryKey = null;
    public $incrementing = false;
}
