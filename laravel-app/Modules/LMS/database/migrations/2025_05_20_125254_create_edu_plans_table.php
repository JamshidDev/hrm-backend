<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\LMS\Enums\EduPlanTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('edu_plans', static function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->foreignId('learning_center_id')
                ->constrained('learning_centers')
                ->cascadeOnDelete();
            $table->foreignId('specialization_id')
                ->constrained('specializations')
                ->cascadeOnDelete();
            $table->tinyInteger('type')->default(EduPlanTypeEnum::ONE->value);
            $table->date('start_date')->nullable()->index();
            $table->integer('hours')->nullable();
            $table->integer('count_groups')->default(1);
            $table->integer('count_workers')->default(30);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('edu_plans');
    }
};
