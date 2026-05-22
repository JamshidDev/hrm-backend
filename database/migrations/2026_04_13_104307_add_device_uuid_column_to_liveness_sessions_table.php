<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('liveness_sessions', function (Blueprint $table) {
            $table->string('device_uuid')->index()->nullable();
            $table->string('type', 10)->index()->nullable();
        });
    }


    public function down(): void
    {
        Schema::table('liveness_sessions', function (Blueprint $table) {
            $table->dropIndex('liveness_sessions_device_uuid');
            $table->dropColumn('device_uuid');
            $table->dropColumn('type');
        });
    }
};
