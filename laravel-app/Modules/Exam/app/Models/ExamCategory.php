<?php

namespace Modules\Exam\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamCategory extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function questions(): HasMany
    {
        return $this->hasMany(ExamCategoryQuestion::class, 'exam_category_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        $query->where('user_id', $user->id);
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }
}
