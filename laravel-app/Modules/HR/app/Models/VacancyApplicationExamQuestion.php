<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacancyApplicationExamQuestion extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function vacancyApplication(): BelongsTo
    {
        return $this->belongsTo(VacancyApplicationExam::class, 'vacancy_application_exam_id');
    }
}
