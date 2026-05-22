<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkerPassport extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    protected static function boot()
    {
        parent::boot();

        static::creating(static function ($model) {
            static::query()->where('worker_id', $model->worker_id)->update(['current' => false]);
            $model->current = true;
        });
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function scopeFilter($query)
    {
        $worker_id = Helper::idUuid(request('uuid'));

        return $query
            ->when($worker_id, function ($q, $worker_id) {
                $q->where('worker_id', $worker_id);
            });
    }
}
