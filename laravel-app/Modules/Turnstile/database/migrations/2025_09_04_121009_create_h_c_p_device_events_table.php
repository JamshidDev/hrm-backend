<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('h_c_p_device_events', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('sync_h_c_p_access_log_id')
                ->constrained('sync_h_c_p_access_logs')
                ->cascadeOnDelete();
            $table->foreignId('hik_central_device_id')
                ->constrained('hik_central_devices')
                ->cascadeOnDelete();
            $table->dateTime('start_time')->nullable()->index();
            $table->dateTime('end_time')->nullable()->index();
            $table->integer('events_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('h_c_p_device_events');
    }
};
