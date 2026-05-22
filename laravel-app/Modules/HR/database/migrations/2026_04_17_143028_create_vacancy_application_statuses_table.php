<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\VacancyLevelEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacancy_application_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_application_id')->constrained();
            $table->tinyInteger('type')->default(VacancyLevelEnum::ONE->value);
            $table->json('details')->nullable();
            $table->tinyInteger('status')->default(1);
            $table->text('message')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_application_statuses');
    }
};
