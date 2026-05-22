<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('hik_central_access_level_devices', static function (Blueprint $table) {
            $table->unsignedBigInteger('hik_central_access_level_id');

            $table->foreign('hik_central_access_level_id', 'hc_level_id_fk')
                ->references('id')
                ->on('hik_central_access_levels')
                ->onDelete('cascade');

            $table->foreignId('hik_central_device_id')
                ->constrained('hik_central_devices')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hik_central_access_level_devices');
    }
};
