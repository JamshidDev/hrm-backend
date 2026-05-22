<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;


class EduPlan extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function learning_center(): BelongsTo
    {
        return $this->belongsTo(LearningCenter::class);
    }

    public function specialization(): BelongsTo
    {
        return $this->belongsTo(Specialization::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(EduPlanExam::class, 'edu_plan_id');

    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class,
            'edu_plan_workers',
            'edu_plan_id',
            'worker_id')
            ->withPivot([
                'worker_position_id',
                'learning_center_id',
                'organization_id',
            ])
            ->wherePivotNull('deleted_at');
    }

    public function scopeFilter($query, $user, array $filters = []): Builder
    {
        $learningCenterIds = LearningCenterUser::query()
            ->where('user_id', $user->id)
            ->select('learning_center_id');

        return $query->whereIn('learning_center_id', $learningCenterIds);
    }

    public function has_workers(): HasMany
    {
        return $this->hasMany(EduPlanWorker::class, 'edu_plan_id');
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class, 'edu_plan_id');
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'edu_plan_subjects');
    }
}
