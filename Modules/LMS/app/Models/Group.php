<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;

class Group extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function getCode($learningCenter): string
    {
        return 'M' . $learningCenter?->code . ' ' . $this->code . '-guruh';
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")->orWhereLike('name_ru', "%$search%")
                ->orWhereLike('name_en', "%$search%");
        });
    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class, 'edu_plan_workers', 'group_id', 'worker_id');
    }

    public function learning_center(): BelongsTo
    {
        return $this->belongsTo(LearningCenter::class);
    }

    public function edu_plan(): BelongsTo
    {
        return $this->belongsTo(EduPlan::class);
    }
}
