<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Command;
use Modules\HR\Models\Worker;


class CommandConfirmation extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('worker_id', $user->worker_id);
    }
    public function command(): BelongsTo
    {
        return $this->belongsTo(Command::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

}
