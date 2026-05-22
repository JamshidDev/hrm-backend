<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;


class ExamCategoryOption extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function question(): BelongsTo
    {
        return $this->belongsTo(ExamCategoryQuestion::class, 'category_question_id');
    }
}
