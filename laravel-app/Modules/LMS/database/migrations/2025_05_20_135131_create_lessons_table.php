<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('lessons', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_center_id')
                ->constrained('learning_centers')
                ->cascadeOnDelete();

            $table->foreignId('edu_plan_id')
                ->constrained('edu_plans')
                ->cascadeOnDelete();

            $table->foreignId('group_id')
                ->constrained('groups')
                ->cascadeOnDelete();

            $table->foreignId('subject_id')->constrained('subjects');
            $table->foreignId('teacher_id')->constrained('teachers');
            $table->string('name')->nullable();
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->date('lesson_date')->index();
            $table->time('start_time')->index();
            $table->time('end_time')->index();
            $table->string('zoom_meeting_uuid')->nullable();
            $table->bigInteger('zoom_meeting_id')->nullable();
            $table->text('zoom_start_url')->nullable();
            $table->string('zoom_join_url')->nullable();
            $table->string('zoom_password')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
