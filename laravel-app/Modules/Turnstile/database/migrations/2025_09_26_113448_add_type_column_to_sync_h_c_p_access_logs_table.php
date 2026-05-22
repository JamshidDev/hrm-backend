<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Turnstile\Enums\SyncTypeEnum;
use Modules\Turnstile\Models\SyncHCPAccessLog;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('sync_h_c_p_access_logs', static function (Blueprint $table) {
            $table->foreignId('user_id')->after('id')->nullable()->constrained('users');
            $table->tinyInteger('type')->after('status')->default(SyncTypeEnum::ONE->value);
            $table->date('day')->after('type')->nullable();
            $table->integer('events_count')->after('day')->default(0);
        });

        SyncHCPAccessLog::query()->whereNot('status', 1)->forceDelete();
    }


    public function down(): void
    {
        Schema::table('sync_h_c_p_access_logs', static function (Blueprint $table) {
            $table->dropColumn('day');
            $table->dropColumn('type');
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('events_count');
        });
    }
};
