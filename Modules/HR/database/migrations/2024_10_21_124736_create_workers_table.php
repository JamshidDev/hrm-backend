<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\MaritalStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('workers', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('country_id')->index()->nullable()->constrained('countries');
            $table->foreignId('region_id')->index()->nullable()->constrained('regions');
            $table->foreignId('city_id')->index()->nullable()->constrained('cities');
            $table->foreignId('current_region_id')->index()->nullable()->constrained('regions');
            $table->foreignId('current_city_id')->index()->nullable()->constrained('cities');
            $table->foreignId('nationality_id')->index()->nullable()->constrained('nationalities');
            $table->string('last_name', 100)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('middle_name', 100)->nullable();
            $table->string('photo')->nullable();
            $table->date('birthday')->index();
            $table->boolean('sex')->default(true)->index();
            $table->bigInteger('pin')->index()->unique()->nullable();
            $table->string('address')->nullable();
            $table->integer('work_experience')->default(0);
            $table->date('experience_date')->nullable();
            $table->tinyInteger('marital_status')->default(MaritalStatusEnum::ONE->value);
            $table->integer('external')->nullable();
            $table->unsignedTinyInteger('birth_day')->nullable()->index();
            $table->unsignedTinyInteger('birth_month')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->fullText(['last_name', 'first_name', 'middle_name']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('workers');
    }
};
