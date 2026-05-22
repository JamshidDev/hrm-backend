<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('position_instruction_workers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_instruction_id')->constrained('position_instructions')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions');
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('position_instruction_workers');
    }
};
