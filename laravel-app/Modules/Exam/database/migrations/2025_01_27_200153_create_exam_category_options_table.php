<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('exam_category_options', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_question_id')
                ->nullable()
                ->constrained('exam_category_questions')
                ->cascadeOnDelete();
            $table->text('text');
            $table->boolean('is_correct')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('exam_category_options');
    }
};
