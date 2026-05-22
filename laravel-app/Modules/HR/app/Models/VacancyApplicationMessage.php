<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class VacancyApplicationMessage extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
}
