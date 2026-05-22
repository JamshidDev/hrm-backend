<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class Holiday extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeSearch($query): Builder
    {
        return $query->whereMonth('holiday_date', request('month', date('m')));
    }

}
