<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;

class WorkDuration extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];


    public function scopeFilter($query, $user, array $filters = []): Builder
    {
        return $query->whereHas('worker_position', function ($q) use ($user) {
            $q->filter($user, request()->all());
        })->orWhereHas('worker', function ($q) use ($user) {
            $q->whereHas('position', function ($q) use ($user) {
                $q->filter($user, request()->all());
            });
        });
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function access_level(): BelongsTo
    {
        return $this->belongsTo(HikCentralAccessLevel::class, 'access_level_id');
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
