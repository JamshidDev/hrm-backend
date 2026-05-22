<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Economist\Models\Statement;
use Modules\Exam\Models\WorkerExam;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\City;
use Modules\Structure\Models\Country;
use Modules\Structure\Models\Language;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Region;
use Modules\Structure\Models\University;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use Modules\Turnstile\Models\WorkerTerminal;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Worker extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($worker) {
            $worker->uuid = (string)Str::uuid();
            if (!$worker->card) {
                $worker->card = 7000000 + self::generateUniqueCardNumber();
            }
        });

        static::saving(static function ($worker) {
            if ($worker->birthday) {
                $birthday = Carbon::parse($worker->birthday);
                $worker->birth_day = $birthday->day;
                $worker->birth_month = $birthday->month;
            }
        });
    }

    public function scopeFilter($query, $user, array $filters = []): Builder
    {
        return $query
            ->whereHas('position', function ($query) use ($user, $filters) {
                $query->filter($user, $filters)
                    ->when($filters['departments'] ?? null, function (Builder $query, $departments) {
                        $query->whereIn('department_id', explode(',', $departments));
                    });
            });
    }

    private static function generateUniqueCardNumber(): int
    {
        $blockedNumbers = [
            '000000', '111111', '222222', '333333', '444444',
            '555555', '666666', '777777', '888888', '999999',
            '123456', '654321', '112233', '223344', '445566',
            '700000', '000007', '000008', '000009', '000001',
            '000002', '000003', '000004', '000005', '000006',
            '100000'
        ];

        do {
            $number = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $existsInDb = self::where('card', 7000000 + (int)$number)->exists();
            $isBlocked = in_array($number, $blockedNumbers, true);

        } while ($existsInDb || $isBlocked);

        return (int)$number;
    }

    public function scopeSearchByFullName($query)
    {
        $search = request('search');

        if ($query && $search) {
            $search = QueryHelper::escapeLike($search);
            $terms = explode(' ', trim($search));
            foreach ($terms as $term) {
                $query->where(function ($query) use ($term) {
                    $query->whereLike('last_name', "%$term%")
                        ->orWhereLike('first_name', "%$term%")
                        ->orWhereLike('middle_name', "%$term%");
                });
            }
            $query->orWhereLike('pin', $search)->orWhereLike('card', (int)$search);
        }
        return $query;
    }

    public function full_name(): string
    {
        return $this->last_name . ' ' . $this->first_name . ' ' . $this->middle_name;
    }

    public function short_name(): string
    {
        $shorten = static function ($name) {
            $exceptions = [
                'Yu',
                'YU',
                'SH',
                'sh',
                'Sh',
                'Ch',
                'CH',
                'ch',
                'yu',
                "O'",
                "o'",
                'O?',
                'o?',
                "G'",
                "G?",
                "g?",
                "g'",
                "Oʻ",
                "O’",
                "Gʻ",
                "G’",
                "oʻ",
                "o’",
                "gʻ",
                "g’",
            ];
            $two = mb_substr($name, 0, 2);
            return in_array($two, $exceptions, true) ? $two : mb_substr($name, 0, 1);
        };

        return $shorten($this->first_name) . '.' . $shorten($this->middle_name) . '.' . $this->last_name;
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()->logUnguarded()->logOnlyDirty();
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->whereLike('first_name', '%' . $search . '%')
                    ->orWhereLike('last_name', '%' . $search . '%')
                    ->orWhereLike('middle_name', '%' . $search . '%');
            });
        });
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class, 'worker_id')
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class, 'worker_id')
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }

    public function all_positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class, 'worker_id');
    }

    public function position(): HasOne
    {
        return $this->hasOne(WorkerPosition::class, 'worker_id')
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }

    public function old_careers(): HasMany
    {
        return $this->hasMany(WorkerOldCareer::class, 'worker_id');
    }

    public function profile(): HasOne
    {
        return $this->hasOne(User::class, 'worker_id');
    }

    public function hcpPerson(): HasOne
    {
        return $this->hasOne(WorkerHikCentral::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(WorkerExam::class, 'worker_id');
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(WorkerPhoto::class, 'worker_id');
    }

    public function current_photo(): HasOne
    {
        return $this->hasOne(WorkerPhoto::class, 'worker_id')->whereCurrent(true);
    }

    public function languages(): BelongsToMany
    {
        return $this->belongsToMany(Language::class, 'worker_languages', 'worker_id', 'language_id');
    }

    public function academic_degrees(): HasMany
    {
        return $this->hasMany(WorkerAcademicDegree::class, 'worker_id');
    }

    public function parties(): HasMany
    {
        return $this->hasMany(WorkerParty::class, 'worker_id');
    }

    public function academic_titles(): HasMany
    {
        return $this->hasMany(WorkerAcademicTitle::class, 'worker_id');
    }

    public function academic_degree(): HasOne
    {
        return $this->hasOne(WorkerAcademicDegree::class, 'worker_id');
    }

    public function academic_title(): HasOne
    {
        return $this->hasOne(WorkerAcademicTitle::class, 'worker_id');
    }

    public function party(): HasOne
    {
        return $this->hasOne(WorkerParty::class, 'worker_id')->orderByDesc('id');
    }

    public function relatives(): HasMany
    {
        return $this->hasMany(WorkerRelative::class, 'worker_id')->orderBy('sort');
    }

    public function universities(): HasMany
    {
        return $this->hasMany(WorkerUniversity::class, 'worker_id');
    }

    public function fullEducations(): string
    {
        $universitiesArray = [];
        $specialitiesArray = [];

        if (count($this->universities)) {
            foreach ($this->universities as $university) {
                $u = $university->university;

                if ($u) {
                    $universitiesArray[] = Carbon::parse(
                            $university->to_date
                        )->year . '-yil,' . $u->name;

                    $specialitiesArray[] = $university->speciality->name;
                }
            }
            return implode(', ', $universitiesArray) . ', ' . implode(', ', $specialitiesArray);
        }
        return '';
    }

    public function educations(): BelongsToMany
    {
        return $this->belongsToMany(University::class, 'worker_universities', 'worker_id', 'university_id');
    }

    public function phones(): HasMany
    {
        return $this->hasMany(WorkerPhone::class, 'worker_id');
    }

    public function statements(): HasMany
    {
        return $this->hasMany(Statement::class);
    }

    public function statementsByPin(): HasMany
    {
        return $this->hasMany(Statement::class, 'pin', 'pin')
            ->where('year', request('year'))->where('month', request('month'));
    }

    public function passport(): HasOne
    {
        return $this->hasOne(WorkerPassport::class, 'worker_id')
            ->where('current', true);
    }

    public function passports(): HasMany
    {
        return $this->hasMany(WorkerPassport::class, 'worker_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function nationality(): BelongsTo
    {
        return $this->belongsTo(Nationality::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function meds(): HasMany
    {
        return $this->hasMany(Med::class);
    }

    public function med(): HasOne
    {
        return $this->hasOne(Med::class)->where('current', true);
    }

    public function vacations(): HasMany
    {
        return $this->hasMany(Vacation::class);
    }

    public function currentVacation(): HasOne
    {
        return $this->hasOne(Vacation::class)->whereDate('to', '>=', now()->format('Y-m-d'));
    }

    public function terminals(): HasMany
    {
        return $this->hasMany(WorkerTerminal::class);
    }

    public function access_levels(): HasMany
    {
        return $this->hasMany(WorkerAccessLevel::class);
    }

    public function terminal_events(): HasMany
    {
        return $this->hasMany(TerminalEvent::class);
    }

    public function current_region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'current_region_id');
    }

    public function current_city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'current_city_id');
    }

    public function fullCurrentAddress(): string
    {
        return implode(', ', array_filter([
            optional($this->current_region)->name,
            optional($this->current_city)->name,
            $this->address
        ]));
    }

    public function fullBirthdayAddress(): string
    {
        return implode(', ', array_filter([
            optional($this->region)->name,
            optional($this->city)->name
        ]));
    }


    public function implodePositions(): string
    {
        $positions = $this->positions->pluck('post_name')->toArray();
        return implode(', ', $positions);
    }

    public function time_sheet_departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'time_sheet_worker_departments', 'worker_id', 'department_id');
    }

    public function time_sheet_organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'time_sheet_worker_departments', 'worker_id', 'work_place_id');
    }

    public function incentives(): HasMany
    {
        return $this->hasMany(OrganizationIncentive::class, 'worker_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(TurnstileWorkerSchedule::class, 'worker_id');
    }

    public function disciplinaryActions(): HasMany
    {
        return $this->hasMany(OrganizationDisciplinary::class, 'worker_id');
    }

}
