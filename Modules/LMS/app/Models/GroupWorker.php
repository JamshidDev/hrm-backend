<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;

class GroupWorker extends Model
{

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'worker_id');
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class, 'worker_position_id');
    }
}
