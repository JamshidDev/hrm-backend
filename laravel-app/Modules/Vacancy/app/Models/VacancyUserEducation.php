<?php

namespace Modules\Vacancy\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacancyUserEducation extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

}
