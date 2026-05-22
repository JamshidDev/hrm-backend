<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;


class Teacher extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'teacher_subjects', 'teacher_id', 'subject_id')
            ->withPivot('learning_center_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function learning_center(): BelongsTo
    {
        return $this->belongsTo(LearningCenter::class);
    }
}
