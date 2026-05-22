<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UploadFile extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

}
