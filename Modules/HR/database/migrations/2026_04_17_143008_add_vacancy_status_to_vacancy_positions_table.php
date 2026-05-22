<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\VacancyChangeStatusEnum;
use Modules\HR\Enums\VacancyLevelEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('vacancy_positions', function (Blueprint $table) {
            $table->tinyInteger('vacancy_status')
                ->default(VacancyLevelEnum::ONE->value);
        });

        Schema::table('vacancy_application_messages', function (Blueprint $table) {
            $table->tinyInteger('change_status')->default(VacancyChangeStatusEnum::ONE->value);
        });
    }


    public function down(): void
    {
        Schema::table('vacancy_positions', function (Blueprint $table) {
            $table->dropColumn('vacancy_status');
        });

        Schema::table('vacancy_application_messages', function (Blueprint $table) {
            $table->dropColumn('change_status');
        });
    }
};
