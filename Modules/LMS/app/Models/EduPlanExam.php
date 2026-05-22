<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Exam\Models\Exam;

class EduPlanExam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
