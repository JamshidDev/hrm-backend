<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('work_durations', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained('buildings');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->integer('year')->nullable()->index();
            $table->tinyInteger('month')->nullable()->index();
            $table->tinyInteger('day')->nullable()->index();
            $table->integer('total_minutes')->default(0);
            $table->datetime('event_time')->index();
            $table->boolean('event_type')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'building_id', 'year', 'month', 'day'], 'unique_work_durations');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('work_durations');
    }
};
