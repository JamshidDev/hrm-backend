<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;


class ExamCategoryQuestion extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function options(): HasMany
    {
        return $this->hasMany(ExamCategoryOption::class, 'category_question_id');
    }

    public function exam_category(): BelongsTo
    {
        return $this->belongsTo(ExamCategory::class, 'exam_category_id');
    }
}
