<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacancyApplicationFile extends Model
{
    use SoftDeletes;

    protected $guarded = [];

}
