<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;


class TerminalLog extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function terminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function scopeFirstEntries($query, $user)
    {
        $from = request('from') ?? now()->startOfDay();
        $to = request('to') ?? now()->endOfDay();
        $firstTime = request('first_time') ?? '09:00:00';

        $subquery = self::query()
            ->whereHas('worker_position', function ($q) use ($user) {
                $q->filter($user, request()->all());
            })
            ->select(
                'worker_id',
                DB::raw('DATE(event_time) as day'),
                DB::raw('MIN(event_time) as first_entry')
            )
            ->where('event_type', true) // faqat kirishlar
            ->whereBetween('event_time', [$from, $to])
            ->groupBy('worker_id', DB::raw('DATE(event_time)'));

        return self::query()
            ->joinSub($subquery, 'first_entries', function ($join) {
                $join->on('terminal_logs.worker_id', '=', 'first_entries.worker_id')
                    ->on(DB::raw('DATE(terminal_logs.event_time)'), '=', 'first_entries.day')
                    ->on('terminal_logs.event_time', '=', 'first_entries.first_entry');
            })
            ->with([
                'worker_position:id,department_id,position_id,organization_id',
                'worker_position.organization:id,name,name_ru,name_en,group',
                'worker_position.position:id,name',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
                'terminal:id,name,name_ru,name_en,building_id',
                'terminal.building:id,name',
            ])
            ->orderBy('first_entries.day')
            ->orderBy('first_entries.first_entry')
            ->whereTime('terminal_logs.event_time', '>', $firstTime);
    }
}
