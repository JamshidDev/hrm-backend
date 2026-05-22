<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\MaritalStatusEnum;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacancy_users', static function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->string('phone')->index()->unique();
            $table->string('last_name', 100)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('middle_name', 100)->nullable();
            $table->string('photo')->nullable();
            $table->tinyInteger('education')->default(EducationEnum::THREE->value);
            $table->timestamp('phone_verified_at')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->string('password');
            $table->boolean('status')->default(true);
            $table->boolean('sex')->default(false);
            $table->date('birthday')->nullable();
            $table->foreignId('country_id')->index()->nullable()->constrained('countries');
            $table->foreignId('city_id')->index()->nullable()->constrained('cities');
            $table->foreignId('region_id')->index()->nullable()->constrained('regions');
            $table->foreignId('current_region_id')->index()->nullable()->constrained('regions');
            $table->foreignId('current_city_id')->index()->nullable()->constrained('cities');
            $table->foreignId('nationality_id')->index()->nullable()->constrained('nationalities');
            $table->string('address')->nullable();
            $table->tinyInteger('marital_status')->default(MaritalStatusEnum::ONE->value);
            $table->bigInteger('pin')->index()->unique()->nullable();
            $table->string('languages')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_users');
    }
};
