<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")
                ->orWhereLike('name_ru', "%$search%")
                ->orWhereLike('name_en', "%$search%");
        });
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'teachers', 'subject_id', 'teacher_id')
            ->withPivot('learning_center_id');
    }
}
