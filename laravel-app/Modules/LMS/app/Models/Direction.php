<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Direction extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")->orWhereLike('name_ru', "%$search%")->orWhereLike('name_en', "%$search%");
        });
    }
}
