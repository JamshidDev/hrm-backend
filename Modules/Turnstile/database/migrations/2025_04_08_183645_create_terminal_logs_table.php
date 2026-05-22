<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('terminal_logs', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained('buildings');
            $table->foreignId('terminal_id')->constrained('terminals');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->datetime('event_time')->index();
            $table->boolean('event_type')->default(false)->index();
            $table->boolean('expired')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('terminal_logs');
    }
};
