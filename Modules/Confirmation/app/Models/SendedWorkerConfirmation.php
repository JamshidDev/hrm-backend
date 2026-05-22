<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\Med\Models\SendedWorker;


class SendedWorkerConfirmation extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('worker_id', $user->worker_id);
    }
    public function sended_worker(): BelongsTo
    {
        return $this->belongsTo(SendedWorker::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

}
