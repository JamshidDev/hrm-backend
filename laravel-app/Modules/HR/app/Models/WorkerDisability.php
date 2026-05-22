<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;


class WorkerDisability extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function scopeFilter($query)
    {
        return $query->where('worker_id', Helper::idUuid(request('uuid')));
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
