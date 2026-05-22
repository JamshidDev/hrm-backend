<?php

namespace Modules\TimeSheet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerPosition;


class TimeSheetWorker extends Model
{
    use SoftDeletes;


    protected $guarded = [];

    protected $casts = [
        'status' => 'integer',
    ];

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

}
