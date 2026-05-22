<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_exam_questions', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('worker_exam_id')->constrained('worker_exams')
                ->cascadeOnDelete();
            $table->text('question');
            $table->boolean('is_correct')->default(false);
            $table->json('answers')->nullable();
            $table->integer('result')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_exam_questions');
    }
};
