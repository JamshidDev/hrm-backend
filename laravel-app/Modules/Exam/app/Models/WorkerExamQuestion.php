<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerExamQuestion extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker_exam(): BelongsTo
    {
        return $this->belongsTo(WorkerExam::class);
    }

}
