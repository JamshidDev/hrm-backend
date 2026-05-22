<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerPosition;


class Schedule extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%");
        });
    }

    public function work_days()
    {
        return $this->hasMany(WorkDay::class, 'schedule_id');
    }

    public function worker_positions(): BelongsToMany
    {
        return $this->belongsToMany(WorkerPosition::class, 'worker_position_schedules', 'schedule_id', 'worker_position_id');
    }
}
