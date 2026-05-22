<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;


class WorkerTerminal extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function terminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

}
