<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Vacancy\Models\VacancyUser;

class VacancyApplication extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function files(): HasMany
    {
        return $this->hasMany(VacancyApplicationFile::class, 'vacancy_application_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(VacancyUser::class, 'vacancy_user_id', 'id');
    }

    public function vacancy_position(): BelongsTo
    {
        return $this->belongsTo(VacancyPosition::class, 'vacancy_position_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(VacancyApplicationMessage::class, 'vacancy_application_id');
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(VacancyApplicationStatus::class, 'vacancy_application_id');
    }

    public function currentStatus(): HasOne
    {
        return $this->hasOne(VacancyApplicationStatus::class, 'vacancy_application_id');
    }
}
