<?php

namespace Modules\Exam\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Confirmation\Models\WorkerExamConfirmation;
use Modules\HR\Models\Worker;


class WorkerExam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public static function getModelKeyName(): string
    {
        return 'worker.exams';
    }
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(WorkerExamQuestion::class, 'worker_exam_id')->orderBy('id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(WorkerExamConfirmation::class, 'worker_exam_id');
    }

}
