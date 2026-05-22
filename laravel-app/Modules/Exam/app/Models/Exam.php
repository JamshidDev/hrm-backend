<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\LMS\Models\EduPlan;
use Modules\Structure\Models\Position;


class Exam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function positions(): BelongsToMany
    {
        return $this->belongsToMany(Position::class, 'exam_positions', 'exam_id', 'position_id');
    }

    public function hasPositions(): HasMany
    {
        return $this->hasMany(ExamPosition::class, 'exam_id');
    }

    public function hasWorkers(): HasMany
    {
        return $this->hasMany(ExamWorker::class, 'exam_id');
    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class, 'exam_workers')
            ->withPivot('worker_position_id');
    }

    public function worker_positions(): BelongsToMany
    {
        return $this->belongsToMany(WorkerPosition::class, 'exam_workers', 'exam_id', 'worker_position_id');
    }

    public function solved_workers(): HasMany
    {
        return $this->hasMany(WorkerExam::class, 'exam_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(WorkerExam::class, 'exam_id');
    }

    public function eduPlans(): BelongsToMany
    {
        return $this->belongsToMany(EduPlan::class, 'edu_plan_exams', 'exam_id', 'edu_plan_id');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(ExamTest::class, 'exam_id');
    }

    public function exam_tests(): HasMany
    {
        return $this->hasMany(ExamTest::class, 'exam_id');
    }

    public function scopeFilter($query, $user, array $filters = []): void
    {
        $userOrgId = $user->organization_id;
        $workerId = $user->worker_id;
        $positionId = $user->load('worker.position')->worker?->position?->position_id;

        $query->where('active', true)
            ->where(function ($q) use ($workerId, $positionId, $userOrgId) {
                // whom = 3 → faqat aniq belgilangan xodimlarga
                $q->when(true, function ($q) use ($workerId) {
                    $q->orWhere(function ($q) use ($workerId) {
                        $q->where('whom', ExamWhomEnum::THREE->value)
                            ->whereHas('hasWorkers', fn($w) => $w->where('worker_id', $workerId));
                    });
                });

                // whom = 2 → lavozim bo‘yicha
                $q->orWhere(function ($q) use ($positionId, $userOrgId) {
                    $q->where('whom', ExamWhomEnum::TWO->value)
                        ->whereHas('topic.hasOrganizations', fn($t) => $t->where('organization_id', $userOrgId))
                        ->whereHas('hasPositions', fn($p) => $p->where('position_id', $positionId));
                });

                // whom = 1 → barchaga ko‘rinadigan examlar (optional)
                $q->orWhere('whom', ExamWhomEnum::ONE->value)
                    ->whereHas('topic.hasOrganizations', fn($t) => $t->where('organization_id', $userOrgId));

                // whom = 4 → hech kimga ko‘rinmaydi
                $q->orWhere(function ($q) use ($workerId, $userOrgId) {
                    $q->where('whom', ExamWhomEnum::FOUR->value)
                        ->whereHas('topic.hasOrganizations', fn($t) => $t->where('organization_id', $userOrgId))
                        ->whereHas('eduPlans', function ($query) use ($workerId) {
                            $query->whereHas('workers', function ($query) use ($workerId) {
                                $query->where('worker_id', $workerId);
                            });
                        });
                });
            });
    }

}
