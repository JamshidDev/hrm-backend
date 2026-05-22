<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkerPhone extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

}
