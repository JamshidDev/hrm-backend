<?php

namespace Modules\TimeSheet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Department;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;

class TimeSheetWorkerDepartment extends Model
{
    use SoftDeletes;

    protected $table = 'time_sheet_worker_departments';

    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function work_place(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'work_place_id');
    }
}
