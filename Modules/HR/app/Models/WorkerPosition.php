<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Position;
use Modules\Structure\Models\Schedule;
use Modules\TimeSheet\Models\TimeSheetWorker;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileScheduleGroup;
use Modules\Turnstile\Models\TurnstileScheduleType;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkerPosition extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()->logUnguarded()->logOnlyDirty();
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($workerPosition) {
            $workerPosition->uuid = (string)Str::uuid();
        });
    }

    public function scheduleDays(): HasMany
    {
        return $this->hasMany(TurnstileWorkerSchedule::class, 'worker_position_id');
    }

    public function terminal_events(): HasMany
    {
        return $this->hasMany(TerminalEvent::class, 'worker_id', 'worker_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        $query->where('status', PositionStatusEnum::ACTIVE->value);
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeRemainingFilter($query)
    {
        if (request('departments')) {
            $departments = array_filter(explode(',', request('departments')));
        } else {
            $departments = null;
        }

        if (request('positions')) {
            $positions = array_filter(explode(',', request('positions')));
        } else {
            $positions = null;
        }

        return $query
            ->when(request()->has('multiple_position') && request('multiple_position'),
                fn($q) => $q->multipleActivePositions())
            ->when(request('contract_id'), function ($query, $contract) {
                $query->where('contract_id', $contract);
            })
            ->when(request('contract_type'), function ($query, $contract_type) {
                $query->whereHas('contract', function ($query) use ($contract_type) {
                    $query->where('type', $contract_type);
                });
            })
            ->when($departments, function ($query, $departments) {
                $query->whereIn('department_id', $departments);
            })
            ->when(request('birthday'), function ($query, $birthday) {
                $query->whereHas('worker', function ($query) use ($birthday) {
                    $query->whereMonth('birthday', $birthday);
                });
            })
            ->when(request('position_type'), function ($query, $position_type) {
                $query->whereHas('position', function ($query) use ($position_type) {
                    $query->where('category', $position_type);
                });
            })
            ->when($positions, function ($query, $positions) {
                $query->whereIn('position_id', $positions);
            })
            ->when(request('department_positions'), function ($query, $department_positions) {
                $query->whereIn('department_position_id', explode(',', $department_positions));
            })
            ->when(request('age_start'), function ($query, $age_start) {
                $query->whereHas('worker', function ($query) use ($age_start) {
                    $query->where('birthday', '<=', now()->subYears($age_start));
                });
            })
            ->whereHas('worker', function ($query) {
                if (request('birthday')) {
                    $query->whereMonth('birthday', request('birthday'));
                }

                if (request('sex') !== null && request()->has('sex')) {
                    $query->where('sex', (bool)request('sex'));
                }

                if (request('age_start') && request('age_end')) {
                    $ageStart = request('age_start');
                    $ageEnd = request('age_end');

                    if ($ageStart && $ageEnd && $ageStart > $ageEnd) {
                        [$ageStart, $ageEnd] = [$ageEnd, $ageStart];
                    }

                    $query
                        ->when($ageStart, fn($q) => $q->where('birthday', '<=', now()->subYears($ageStart))
                        )
                        ->when($ageEnd, fn($q) => $q->where('birthday', '>=', now()->subYears($ageEnd))
                        )
                        ->when(request()->has('sex'), fn($q) => $q->where('sex', (int)request('sex') === 1)
                        );
                }

                if (request('age_end')) {
                    $query->where('birthday', '>=', now()->subYears(request('age_end')));
                }

                if (request('marital_status')) {
                    $query->where('marital_status', request('marital_status'));
                }

                if (request('country_id')) {
                    $query->where('country_id', request('country_id'));
                }

                if (request('region_id')) {
                    $query->where('region_id', request('region_id'));
                }

                if (request('city_id')) {
                    $query->where('city_id', request('city_id'));
                }

                if (request('current_region_id')) {
                    $query->where('current_region_id', request('current_region_id'));
                }

                if (request('current_city_id')) {
                    $query->where('current_city_id', request('current_city_id'));
                }

                if ($nationalities = array_filter(explode(',', request('nationalities')))) {
                    $query->whereIn('nationality_id', $nationalities);
                }

                if ($educations = array_filter(explode(',', request('educations')))) {
                    $query->whereIn('education', $educations);
                }

                if ($languages = array_filter(explode(',', request('languages')))) {
                    $query->whereHas('languages', function ($q) use ($languages) {
                        $q->whereIn('language_id', $languages);
                    });
                }

                if ($universities = array_filter(explode(',', request('universities')))) {
                    $query->whereHas('universities', function ($q) use ($universities) {
                        $q->whereIn('university_id', $universities);
                    });
                }
            });
    }

    public function scopeSearch($query): Builder
    {
        $query = request()->has('search') ?
            $query->whereHas('worker', fn($q) => $q->SearchByFullName()) : $query;

        if (request('last_name') || request('middle_name') || request('first_name')) {
            $query->whereHas('worker', function ($q) {
                $q->when(request('last_name'), function ($b, $last_name) {
                    $b->whereLike('last_name', '%' . $last_name . '%');
                })->when(request('first_name'), function ($b, $first_name) {
                    $b->whereLike('first_name', '%' . $first_name . '%');
                })->when(request('middle_name'), function ($b, $middle_name) {
                    $b->whereLike('middle_name', '%' . $middle_name . '%');
                });
            });
        }
        return $query;
    }

    public function scopeMultipleActivePositions($query)
    {
        return $query->where('status', PositionStatusEnum::ACTIVE->value)
            ->whereIn('worker_id', function ($sub) {
                $sub->select('worker_id')
                    ->from('worker_positions')
                    ->where('status', PositionStatusEnum::ACTIVE->value)
                    ->groupBy('worker_id')
                    ->whereNull('deleted_at')
                    ->havingRaw('COUNT(position_id) > 1');
            })->orderBy('worker_id');
    }

    public function timesheet(): HasMany
    {
        return $this->hasMany(TimeSheetWorker::class, 'worker_position_id');
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function department_position(): BelongsTo
    {
        return $this->belongsTo(DepartmentPosition::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function schedules(): BelongsToMany
    {
        return $this->belongsToMany(Schedule::class, 'worker_position_schedules', 'worker_position_id', 'schedule_id');
    }

    public function time_sheet_departments(): HasMany
    {
        return $this->hasMany(TimeSheetWorkerDepartment::class, 'worker_position_id');
    }

    public function schedule(): HasOne
    {
        return $this->hasOne(WorkerPositionSchedule::class, 'worker_position_id')->where(['current' => true]);
    }

    public function scheduleType(): BelongsTo
    {
        return $this->belongsTo(TurnstileScheduleType::class, 'turnstile_schedule_type_id');
    }

    public function scheduleGroup(): BelongsTo
    {
        return $this->belongsTo(TurnstileScheduleGroup::class, 'turnstile_schedule_group_id');
    }

    public function vacationSchedule(): HasMany
    {
        return $this->hasMany(VacationSchedule::class, 'worker_id', 'worker_id');
    }

    public function vacations(): HasMany
    {
        return $this->hasMany(Vacation::class, 'contract_id', 'contract_id');
    }

    public function lastVacation(): HasOne
    {
        return $this->hasOne(Vacation::class, 'contract_id', 'contract_id')
            ->whereNotNull('period_from')
            ->orderByDesc('to');
    }

    public function vacation(): HasOne
    {
        return $this->hasOne(Vacation::class, 'contract_id', 'contract_id')
            ->orderByDesc('to');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function command(): BelongsTo
    {
        return $this->belongsTo(Command::class);
    }

    protected function rate(): Attribute
    {
        return Attribute::make(
            get: static fn($value) => $value / 100,
            set: static fn($value) => (int)round(((float)str_replace(',', '.', $value)) * 100),
        );
    }
}
