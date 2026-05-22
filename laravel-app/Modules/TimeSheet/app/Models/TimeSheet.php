<?php

namespace Modules\TimeSheet\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\TimesheetConfirmation;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Department;
use Modules\Structure\Models\Organization;

class TimeSheet extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];


    public function scopeFilter($query): Builder
    {
        return $query->where('user_id', auth()->user()->id);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function work_place(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class);
    }

    public function workers(): HasMany
    {
        return $this->hasMany(TimeSheetWorker::class, 'time_sheet_id');
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function chats(): MorphMany
    {
        return $this->morphMany(DocumentChat::class, 'model');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DocumentFile::class, 'model');
    }


    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }


    public function confirmations(): HasMany
    {
        return $this->hasMany(TimesheetConfirmation::class, 'time_sheet_id');
    }
}
