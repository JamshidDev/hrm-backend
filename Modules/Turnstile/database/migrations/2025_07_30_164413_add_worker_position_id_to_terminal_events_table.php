<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Turnstile\Models\OrganizationAccessLevel;
use Modules\Turnstile\Models\TerminalEvent;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->foreignId('worker_position_id')
                ->nullable()
                ->after('worker_id')
                ->constrained('worker_positions');
        });

        TerminalEvent::query()->whereNull('hik_central_access_level_id')->forceDelete();
        foreach (TerminalEvent::query()->with('worker')->get() as $item) {
            if ($item->accessLevelId) {
                $orgIds = OrganizationAccessLevel::query()
                    ->where('hik_central_access_level_id', $item->accessLevelId)
                    ->pluck('organization_id')
                    ->toArray();

                $item->worker_position_id = $item->worker->load('positions')
                    ->positions
                    ->whereIn('organization_id', $orgIds)
                    ->first()?->id;

                $item->save();
            }
        }
    }


    public function down(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('worker_position_id');
        });
    }
};
