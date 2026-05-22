<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerPositionSchedule extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot()
    {
        parent::boot();

        static::creating(static function ($model) {
            static::query()->where('worker_position_id', $model->worker_position_id)->update(['current' => false]);
            $model->current = true;
        });
    }
}
