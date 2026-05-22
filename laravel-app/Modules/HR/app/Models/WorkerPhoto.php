<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkerPhoto extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $fileSize = Storage::disk('minio')->size($model->photo);
            $model->size = $fileSize ?? null;
        });
    }

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
