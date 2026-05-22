<?php

namespace Modules\Med\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerPosition;

class SendedWorkerCommission extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function commission(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class, 'commission_id');
    }

}
