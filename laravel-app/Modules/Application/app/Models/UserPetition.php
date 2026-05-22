<?php

namespace Modules\Application\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserPetition extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
}
