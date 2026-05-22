<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerApplication;

class WorkerApplicationConfirmation extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('worker_id', $user->worker_id);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function worker_application(): BelongsTo
    {
        return $this->belongsTo(WorkerApplication::class);
    }
}
