<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('sync_offline_devices', static function (Blueprint $table) {
            $table->foreignId('sync_h_c_p_access_log_id')
                ->constrained('sync_h_c_p_access_logs')
                ->cascadeOnDelete();
            $table->integer('hik_central_device_id');
            $table->string('name')->nullable();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('sync_offline_devices');
    }
};
