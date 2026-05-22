<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Exam\Models\Exam;

class VacancyApplicationExam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(VacancyApplicationExamQuestion::class, 'vacancy_application_exam_id')
            ->orderBy('id');
    }
}
