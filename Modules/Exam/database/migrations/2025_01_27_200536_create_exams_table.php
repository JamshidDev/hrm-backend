<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Exam\Enums\ExamWhomEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('exams', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->nullable()->constrained('topics');
            $table->string('name')->nullable();
            $table->dateTime('deadline')->nullable();
            $table->integer('variant')->default(4);
            $table->integer('minute')->default(45);
            $table->integer('tests_count')->default(36);
            $table->integer('chances')->default(1);
            $table->boolean('active')->default(false);
            $table->text('description')->nullable();
            $table->tinyInteger('whom')->default(ExamWhomEnum::ONE->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
