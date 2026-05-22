<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PositionInstructionWorker extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function position_instruction(): BelongsTo
    {
        return $this->belongsTo(PositionInstruction::class);
    }
}
