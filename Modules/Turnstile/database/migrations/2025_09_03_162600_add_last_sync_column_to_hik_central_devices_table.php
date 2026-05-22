<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('hik_central_devices', static function (Blueprint $table) {
            $table->string('area_name')->nullable()->after('name');
            $table->timestamp('last_sync')
                ->after('hik_central_device_id')
                ->nullable()
                ->index('hcp_last_sync_index');
            $table->integer('events_count')
                ->default(0)
                ->after('last_sync');
            $table->boolean('status')->default(true)->after('events_count');
        });
    }


    public function down(): void
    {
        Schema::table('hik_central_devices', static function (Blueprint $table) {
            $table->dropColumn('area_name');
            $table->dropIndex('hcp_last_sync_index');
            $table->dropColumn('last_sync');
            $table->dropColumn('events_count');
            $table->dropColumn('status');
        });
    }
};
