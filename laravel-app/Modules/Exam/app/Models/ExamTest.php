<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;


class ExamTest extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExamCategory::class, 'exam_category_id');
    }
}
