<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('staffing_approve_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staffing_approve_id')->constrained('staffing_approves')->cascadeOnDelete();
            $table->foreignId('department_position_id')->constrained('department_positions');
            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('staffing_approve_positions');
    }
};
