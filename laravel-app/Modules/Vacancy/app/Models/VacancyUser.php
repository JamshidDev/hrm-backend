<?php

namespace Modules\Vacancy\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Modules\HR\Models\Nationality;
use Modules\Structure\Models\City;
use Modules\Structure\Models\Country;
use Modules\Structure\Models\Region;
use Spatie\Permission\Traits\HasRoles;

class VacancyUser extends Model
{
    use HasApiTokens, Notifiable, HasRoles;

    protected $guarded = ['id'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'languages' => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($user) {
            $user->uuid = (string)Str::uuid();
        });
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function current_region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'current_region_id');
    }

    public function current_city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'current_city_id');
    }

    public function careers(): HasMany
    {
        return $this->hasMany(VacancyUserCareer::class, 'vacancy_user_id');
    }

    public function educations(): HasMany
    {
        return $this->hasMany(VacancyUserEducation::class, 'vacancy_user_id');
    }

    public function nationality(): BelongsTo
    {
        return $this->belongsTo(Nationality::class);
    }
}
