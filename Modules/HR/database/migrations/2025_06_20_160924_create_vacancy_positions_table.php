<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\VacancyWorkTypeEnum;
use Modules\HR\Enums\EducationEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacancy_positions', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('department_position_id')->constrained('department_positions');
            $table->integer('rate')->default(1);
            $table->foreignId('city_id')->constrained('cities');
            $table->double('experience')->default(1);
            $table->double('salary')->default(0);
            $table->tinyInteger('work_type')->default(VacancyWorkTypeEnum::ONE->value);
            $table->tinyInteger('education')->default(EducationEnum::ONE->value);
            $table->text('address')->nullable();
            $table->dateTime('to')->nullable();
            $table->integer('view_count')->default(0);
            $table->longText('position_obligations')->nullable();
            $table->longText('qualification_requirements')->nullable();
            $table->longText('working_conditions')->nullable();
            $table->longText('specialties')->nullable();
            $table->boolean('status')->default(false);
            $table->boolean('finish')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacancy_positions');
    }
};
