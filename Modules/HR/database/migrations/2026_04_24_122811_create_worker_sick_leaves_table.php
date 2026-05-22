<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_sick_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions')->cascadeOnDelete();
            $table->date('from_date');
            $table->date('to_date')->nullable();
            $table->json('sick')->nullable();
            $table->tinyInteger('type')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_sick_leaves');
    }
};
