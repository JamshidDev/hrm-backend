<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\TimeSheet\Models\TimeSheet;

class TimesheetConfirmation extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('worker_id', $user->worker_id);
    }
    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(TimeSheet::class, 'time_sheet_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
