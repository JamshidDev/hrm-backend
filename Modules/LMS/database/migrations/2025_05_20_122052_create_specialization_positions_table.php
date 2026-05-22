<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('specialization_positions', static function (Blueprint $table) {
            $table->foreignId('specialization_id')
                ->constrained('specializations')
                ->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('specialization_positions');
    }
};
