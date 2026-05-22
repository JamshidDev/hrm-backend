<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacancy_applications', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_position_id')->constrained('vacancy_positions');
            $table->foreignId('vacancy_user_id')->constrained('vacancy_users');
            $table->boolean('status')->default(VacancySendStatusEnum::ONE->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacancy_applications');
    }
};
