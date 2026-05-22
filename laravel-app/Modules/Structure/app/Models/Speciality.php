<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class Speciality extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    public function scopeSearch($query)
    {
        return $query
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%")->orWhereLike('name_ru',"%$search%" );
            });
    }
}
