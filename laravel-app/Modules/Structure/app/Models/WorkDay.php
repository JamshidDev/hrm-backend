<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkDay extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];


    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('start_time'), function ($q, $start_time) {
                $q->whereTime('start_time', "%$start_time%");
            })
            ->when(request('end_time'), function ($q, $end_time) {
                $q->whereTime('end_time', "%$end_time%");
            });
    }

    public function scopeFilter($query)
    {
        return $query
            ->when(request('schedule_id'), function ($q, $schedule_id) {
                $q->whereHas('schedule', function ($q) use ($schedule_id) {
                    $q->where('id', $schedule_id);
                });
            });
    }

}
