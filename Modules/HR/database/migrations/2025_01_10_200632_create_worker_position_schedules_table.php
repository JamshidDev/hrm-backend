<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_position_schedules', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_position_id')->constrained('worker_positions')
                ->cascadeOnDelete();
            $table->foreignId('schedule_id')->constrained('schedules');
            $table->boolean('current')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_position_schedules');
    }
};
