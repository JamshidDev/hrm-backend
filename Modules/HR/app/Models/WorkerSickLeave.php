<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerSickLeave extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'sick' => 'array',
    ];

    public function scopeFilter($query)
    {
        return $query->where('worker_id', Helper::idUuid(request('uuid')));
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function workerPosition(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }
}
