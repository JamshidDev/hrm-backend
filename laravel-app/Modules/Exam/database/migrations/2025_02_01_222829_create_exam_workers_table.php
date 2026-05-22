<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('exam_workers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->nullable()->constrained('exams')->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('exam_workers');
    }
};
