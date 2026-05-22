<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class VacancyApplicationStatus extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'details' => 'array',
    ];
}
