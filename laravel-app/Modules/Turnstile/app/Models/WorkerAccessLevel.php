<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;


class WorkerAccessLevel extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function access_level(): BelongsTo
    {
        return $this->belongsTo(HikCentralAccessLevel::class, 'hik_central_access_level_id');
    }

}
