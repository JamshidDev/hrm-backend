<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_exam_files', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('worker_exam_id')->constrained('worker_exams')->cascadeOnDelete();
            $table->tinyInteger('type')->default(1);
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->integer('download')->nullable();
            $table->string('front_url')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_exam_files');
    }
};
