<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_position_turnstile_privileges', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_position_id')->constrained('worker_positions');
            $table->string('type', 25)->index();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['worker_position_id', 'type'], 'unique_worker_position_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_position_turnstile_privileges');
    }
};
