<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HikCentralDepartment extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];


}
