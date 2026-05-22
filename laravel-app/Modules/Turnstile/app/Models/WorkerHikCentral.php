<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhoto;

class WorkerHikCentral extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class , 'worker_id');
    }

    public function access_levels(): HasMany
    {
        return $this->hasMany(WorkerAccessLevel::class,'worker_hik_central_id');
    }

    public function photo(): BelongsTo
    {
        return $this->belongsTo(WorkerPhoto::class,'worker_photo_id');
    }
}
