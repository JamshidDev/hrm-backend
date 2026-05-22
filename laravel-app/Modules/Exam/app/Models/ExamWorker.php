<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ExamWorker extends Model
{
    protected $guarded = ['id'];

    public $timestamps = false;

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class, 'exam_workers', 'worker_id', 'exam_id');
    }
}
