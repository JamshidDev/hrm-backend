<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;

class University extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%")->orWhereLike('name_ru',"%$search%" );
            });
    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class, 'worker_educations', 'university_id', 'worker_id');
    }

}
