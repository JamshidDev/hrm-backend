<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerRelativeDisability extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function workerRelative(): BelongsTo
    {
        return $this->belongsTo(WorkerRelative::class);
    }
}
