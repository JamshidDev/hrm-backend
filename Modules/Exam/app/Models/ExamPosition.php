<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ExamPosition extends Model
{
    protected $guarded = ['id'];

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class, 'exam_positions', 'position_id', 'exam_id');
    }
}
