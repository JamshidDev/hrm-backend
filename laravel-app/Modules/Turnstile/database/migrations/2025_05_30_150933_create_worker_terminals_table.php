<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('worker_terminals', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('worker_id')->constrained('workers');
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->foreignId('terminal_id')->constrained('terminals');
            $table->foreignId('worker_photo_id')->constrained('worker_photos');
            $table->dateTime('to')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'terminal_id'], 'unique_worker_terminal');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_terminals');
    }
};
