<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;

class TurnstileWorkerSchedule extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
